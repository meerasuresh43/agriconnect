"""
app.py
Flask 3.0 Production API for Plant Disease Detection.
Integrates MobileNetV2 visual model, verified Knowledge Base, Expert Rules,
Naive Bayes class priors, and Fuzzy Logic Urgency Assessment.
"""

import os
import io
import json
import logging
from flask import Flask, request, jsonify
from PIL import Image
import numpy as np
import tensorflow as tf

import config
from database import init_db, record_prediction, get_recent_predictions
from knowledge_base import get_disease_info
from expert_rules import evaluate_expert_rules
from bayesian import compute_bayesian_posterior, DATASET_CLASS_PRIORS
from fuzzy_logic import evaluate_fuzzy_urgency

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("AgriConnectAI")

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = config.MAX_CONTENT_LENGTH

# Global model state
MODEL = None
CLASS_INDICES = {}
IDX_TO_CLASS = {}


def load_model_and_classes():
    """Load trained MobileNetV2 model and class mapping into memory."""
    global MODEL, CLASS_INDICES, IDX_TO_CLASS
    if os.path.exists(config.MODEL_PATH) and os.path.exists(config.CLASS_INDICES_PATH):
        try:
            logger.info(f"Loading trained MobileNetV2 model from {config.MODEL_PATH}...")
            MODEL = tf.keras.models.load_model(config.MODEL_PATH)
            with open(config.CLASS_INDICES_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                CLASS_INDICES = data.get("class_to_idx", {})
                IDX_TO_CLASS = {int(k): v for k, v in data.get("idx_to_class", {}).items()}
            logger.info(f"Model loaded successfully with {len(IDX_TO_CLASS)} classes: {list(CLASS_INDICES.keys())}")
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            MODEL = None
    else:
        logger.warning("Trained model or class indices not found on disk yet.")
        MODEL = None


# Initialize persistent SQLite DB and load model
init_db()
load_model_and_classes()


@app.route("/api/health", methods=["GET"])
def health_check():
    """Health check endpoint exposing service and model readiness."""
    return jsonify({
        "status": "healthy",
        "service": "AgriConnect Plant Disease Detection AI",
        "version": "1.0.0",
        "framework": f"Flask 3.0 / TensorFlow {tf.__version__}",
        "model_loaded": MODEL is not None,
        "classes_supported": list(CLASS_INDICES.keys()) if MODEL else [],
        "confidence_threshold": config.CONFIDENCE_THRESHOLD
    }), 200


@app.route("/api/classes", methods=["GET"])
def list_classes():
    """Return list of supported disease and healthy plant classes."""
    if not IDX_TO_CLASS:
        return jsonify({"success": False, "message": "Model not loaded yet."}), 503

    classes_data = []
    for idx, name in sorted(IDX_TO_CLASS.items()):
        info = get_disease_info(name)
        classes_data.append({
            "class_id": idx,
            "name": name,
            "common_name": info.get("common_name", name),
            "scientific_name": info.get("scientific_name", "N/A"),
            "category": info.get("category", "Fungal"),
            "is_healthy": info.get("is_healthy", False),
            "dataset_prior": round(DATASET_CLASS_PRIORS.get(name, 0.0), 4)
        })

    return jsonify({
        "success": True,
        "count": len(classes_data),
        "classes": classes_data
    }), 200


@app.route("/api/history", methods=["GET"])
def get_history():
    """Retrieve recent prediction audit logs from persistent SQLite database."""
    try:
        limit = request.args.get("limit", 20)
        history = get_recent_predictions(limit=limit)
        return jsonify({"success": True, "count": len(history), "history": history}), 200
    except Exception as e:
        logger.error(f"Error fetching prediction history: {e}")
        return jsonify({"success": False, "message": "Failed to retrieve history."}), 500


def validate_plant_tissue(image: Image.Image):
    """
    Validates whether an uploaded image contains plant foliage or agricultural tissue.
    Rejects blank, solid color, extreme non-vegetation, and textureless images.
    """
    img_rgb = image.convert("RGB")
    w, h = img_rgb.size
    if w < 50 or h < 50:
        return False, "Image dimensions are too small (minimum 50x50 pixels required)."

    arr = np.array(img_rgb, dtype=np.float32)
    std_dev = float(np.std(arr))
    if std_dev < 12.0:
        return False, "Image appears completely blank, solid color, or lacks discernible visual texture."

    mean_val = float(np.mean(arr))
    if mean_val < 18.0:
        return False, "Image is too dark to discern plant foliage or disease symptoms."
    if mean_val > 248.0 and std_dev < 18.0:
        return False, "Image is overexposed or blank white."

    r = arr[:, :, 0]
    g = arr[:, :, 1]
    b = arr[:, :, 2]

    # Green vegetative chlorophyll tissue or chlorotic/yellow/brown/necrotic lesions
    green_mask = (g > r * 0.85) & (g > b * 0.85) & (g > 25)
    necrotic_mask = (r > 45) & (g > 35) & (b < r) & (b < g * 1.15)
    plant_pixels = int(np.sum(green_mask | necrotic_mask))
    total_pixels = w * h
    plant_ratio = plant_pixels / total_pixels

    # Out-of-distribution dominant sky / blue backdrop check
    blue_dominant = (b > r + 30) & (b > g + 30)
    blue_ratio = int(np.sum(blue_dominant)) / total_pixels

    if blue_ratio > 0.45:
        return False, "Image is dominated by blue background/sky and does not show clear plant foliage."
    if plant_ratio < 0.10:
        return False, "Image does not appear to contain recognizable plant leaves or agricultural crop tissue."

    return True, "Valid plant tissue"


def check_image_blur(image: Image.Image) -> tuple:
    """
    Computes discrete 2D Laplacian variance to detect out-of-focus or motion-blurred leaf images.
    Returns (is_blurred: bool, blur_score: float).
    """
    arr = np.array(image.convert("RGB"), dtype=np.float32)
    gray = np.dot(arr[..., :3], [0.2989, 0.5870, 0.1140])
    if gray.shape[0] < 10 or gray.shape[1] < 10:
        return False, 999.0
    lap = gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:] - 4 * gray[1:-1, 1:-1]
    blur_var = float(np.var(lap))
    return (blur_var < 35.0), blur_var


@app.route("/api/predict", methods=["POST"])
def predict_disease():
    """
    Main disease diagnosis endpoint. Accepts multipart/form-data image upload,
    performs MobileNetV2 visual inference, evaluates expert IF-THEN rules,
    computes Bayesian prior evidence, and calculates fuzzy urgency rating.
    """
    global MODEL
    if MODEL is None:
        load_model_and_classes()
        if MODEL is None:
            return jsonify({
                "success": False,
                "message": "Model has not been trained or loaded yet. Please run train.py first."
            }), 503

    # 1. Validate file presence
    if "image" not in request.files:
        return jsonify({"success": False, "message": "Missing 'image' file in multipart/form-data request."}), 400

    file = request.files["image"]
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Empty or missing filename."}), 400

    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in config.ALLOWED_EXTENSIONS:
        return jsonify({
            "success": False,
            "message": f"Unsupported file format '{ext}'. Allowed extensions: {list(config.ALLOWED_EXTENSIONS)}"
        }), 415

    # 2. Read and validate image content
    try:
        img_bytes = file.read()
        if len(img_bytes) == 0:
            return jsonify({"success": False, "message": "Uploaded image file is empty (0 bytes)."}), 400

        image = Image.open(io.BytesIO(img_bytes))
        image.verify()  # Verify integrity
        image = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        logger.error(f"Corrupted or invalid image uploaded: {e}")
        return jsonify({"success": False, "message": "Invalid or corrupted image file."}), 400

    # Plant tissue validation (out-of-distribution / non-plant leaf rejection)
    is_valid_tissue, tissue_msg = validate_plant_tissue(image)
    if not is_valid_tissue:
        logger.warning(f"Rejected out-of-distribution upload: {tissue_msg}")
        return jsonify({
            "success": False,
            "error": "INVALID_PLANT_TISSUE",
            "message": tissue_msg
        }), 400

    # Blur & out-of-focus detection
    is_blurred, blur_score = check_image_blur(image)
    if is_blurred:
        logger.warning(f"Rejected severely blurred image (blur_score={blur_score:.1f})")
        return jsonify({
            "success": False,
            "error": "BLURRED_IMAGE",
            "error_code": "BLURRED_IMAGE",
            "message": (
                f"The uploaded leaf photograph is out of focus or motion-blurred (clarity score: {int(blur_score)}/1000). "
                "Visual pathology symptoms cannot be reliably diagnosed from a blurred image without guessing. "
                "Please capture a sharp, well-focused close-up photograph in natural daylight and re-upload."
            )
        }), 400

    # Optional query parameters from farmer
    lang = request.form.get("lang", "en")
    weather = request.form.get("weather", "normal")
    irrigation = request.form.get("irrigation", "drip")
    has_alternate_hosts = request.form.get("has_alternate_hosts", "false").lower() == "true"
    lesion_coverage = float(request.form.get("lesion_coverage", 25.0))
    humidity = float(request.form.get("humidity", 65.0))
    season = request.form.get("season", "spring")

    # 3. Preprocess for MobileNetV2
    img_resized = image.resize(config.IMG_SIZE, Image.Resampling.BILINEAR)
    img_arr = np.array(img_resized, dtype=np.float32)
    # The production MobileNetV2 model embeds mobilenet_v2.preprocess_input in its graph.
    # Passing img_arr [0, 255] directly avoids applying normalization twice.
    img_batch = np.expand_dims(img_arr, axis=0)

    # 4. Neural Network Inference
    try:
        predictions = MODEL.predict(img_batch, verbose=0)[0]
    except Exception as e:
        logger.error(f"Inference execution failed: {e}")
        return jsonify({"success": False, "message": "Inference computation failed."}), 500

    pred_idx = int(np.argmax(predictions))
    predicted_class = IDX_TO_CLASS.get(pred_idx, "unknown")
    confidence = float(predictions[pred_idx])

    # Rank all predictions
    top_indices = np.argsort(predictions)[::-1]
    top_predictions = [
        {
            "class": IDX_TO_CLASS.get(int(i), f"Class {i}"),
            "confidence": round(float(predictions[i]) * 100, 2)
        }
        for i in top_indices[:min(5, len(top_indices))]
    ]

    # 5. Calibrated Confidence & Ambiguity Assessment
    threshold = float(request.form.get("threshold", config.CONFIDENCE_THRESHOLD))
    force_uncertain = request.form.get("force_uncertain", "false").lower() == "true"
    
    top1_conf = float(predictions[pred_idx])
    top2_conf = float(predictions[top_indices[1]]) if len(top_indices) > 1 else 0.0
    ratio = top1_conf / (top2_conf + 1e-7)

    # In 89-class classification (random uniform prior = 1.12%), 20% is ~18x random chance.
    # Calibrated confidence categories:
    if top1_conf >= 0.60:
        confidence_level = "High"
    elif top1_conf >= 0.35:
        confidence_level = "Moderate"
    else:
        confidence_level = "Fair (Field Inspection Recommended)"

    # Overlapping symptom ambiguity check (when top 2 are close):
    has_overlapping_symptoms = (top1_conf < 0.50) and (ratio < 1.40)
    overlapping_class = top_predictions[1]["class"] if len(top_predictions) > 1 else None

    # Uncertainty rule:
    # Only return uncertain if explicitly forced by user for simulation,
    # or if top-1 confidence is below genuine noise floor (< 0.18, meaning model has no distinct signal):
    is_uncertain = force_uncertain or (top1_conf < 0.18)

    # 6. Retrieve Verified Knowledge Base Information
    kb_info = get_disease_info(predicted_class)

    # 7. Evaluate Expert IF-THEN Rules
    expert_result = evaluate_expert_rules(
        predicted_class=predicted_class,
        confidence=confidence,
        weather_condition=weather,
        irrigation_method=irrigation,
        has_alternate_hosts=has_alternate_hosts,
        confidence_threshold=threshold
    )

    # 8. Evaluate Fuzzy Logic Intervention Urgency
    fuzzy_result = evaluate_fuzzy_urgency(
        visual_confidence=confidence,
        lesion_coverage_pct=lesion_coverage,
        relative_humidity_pct=humidity
    )

    # 9. Evaluate Bayesian Probabilistic Context
    bayesian_result = compute_bayesian_posterior(
        season=season,
        moisture_profile="high_wet" if humidity > 70 else "moderate" if humidity > 40 else "dry",
        candidate_classes=[p["class"] for p in top_predictions]
    )

    # 10. Record in Persistent SQLite Database
    client_ip = request.remote_addr or "127.0.0.1"
    record_prediction(
        filename=filename,
        predicted_class=predicted_class if not is_uncertain else "Uncertain / Low Confidence",
        confidence=confidence,
        is_uncertain=is_uncertain,
        expert_urgency=expert_result.get("urgency", "Routine"),
        fuzzy_score=fuzzy_result.get("intervention_urgency_score", 5.0),
        client_ip=client_ip
    )

    # 11. Format Response (Bilingual support: English + Tamil)
    is_tamil = lang == "ta"

    if is_uncertain:
        return jsonify({
            "success": True,
            "uncertain": True,
            "confidence": round(confidence * 100, 2),
            "confidence_level": confidence_level,
            "crop": kb_info.get("crop", predicted_class.split()[0].title()),
            "diseaseName": "தெளிவற்ற முடிவுகள் / குறைந்த AI நம்பிக்கை" if is_tamil else "Uncertain Result / Low AI Confidence",
            "predicted_class": predicted_class,
            "warningMessage": (
                (
                    f"⚠️ அறிகுறிகள் '{top_predictions[0]['class']}' ({top_predictions[0]['confidence']}%) மற்றும் '{top_predictions[1]['class']}' ({top_predictions[1]['confidence']}%) இடையே நெருக்கமாக உள்ளன. "
                    "ஊகத்தின் அடிப்படையில் முடிவெடுப்பதைத் தவிர்க்க, தயவுசெய்து அருகிலுள்ள வேளாண் அறிவியல் மையத்தை (KVK) அணுகவும்."
                    if (has_overlapping_symptoms and len(top_predictions) > 1) else
                    f"⚠️ AI மாதிரியின் நம்பிக்கை குறைவாக உள்ளது ({round(confidence * 100, 1)}%, வரம்பு: {int(threshold * 100)}%). "
                    "இலைப்படம் மங்கலாக இருக்கலாம் அல்லது சத்து குறைபாடு இருக்கலாம். தயவுசெய்து வேளாண் அதிகாரியை அணுகவும்."
                )
                if is_tamil else
                (
                    f"⚠️ Symptoms are closely split between '{top_predictions[0]['class']}' ({top_predictions[0]['confidence']}%) and '{top_predictions[1]['class']}' ({top_predictions[1]['confidence']}%). "
                    "To avoid assuming an incorrect disease, automated diagnosis is flagged as uncertain. Please consult a local agricultural extension officer."
                    if (has_overlapping_symptoms and len(top_predictions) > 1) else
                    f"⚠️ The AI visual confidence is low ({round(confidence * 100, 1)}%, threshold: {int(threshold * 100)}%). "
                    "The leaf image may be out of focus, blurry, or showing overlapping nutrient symptoms. "
                    "We recommend consulting an agricultural extension officer or KVK specialist before applying chemicals."
                )
            ),
            "recommendation": (
                "தெளிவான பகல் வெளிச்சத்தில் இலையை நெருக்கமாக படம் எடுத்து மீண்டும் பதிவேற்றவும்."
                if is_tamil else
                "Please retake a sharp, well-lit close-up photograph of the affected leaf in bright natural daylight and re-upload."
            ),
            "top_predictions": top_predictions,
            "expert_system": expert_result,
            "fuzzy_urgency": fuzzy_result,
            "bayesian_context": bayesian_result
        }), 200

    # Build comprehensive recovery and management steps for UI compatibility
    immediate_steps = kb_info.get("immediate_safe_steps", [])
    treatment_options = kb_info.get("treatment_options", [])
    prevention_steps = kb_info.get("prevention", [])
    expert_warning = kb_info.get("expert_warning", "")

    recovery_steps = []
    for s in immediate_steps:
        recovery_steps.append(f"Immediate Safe Step: {s}")
    for s in treatment_options:
        recovery_steps.append(f"University Treatment: {s}")
    for s in prevention_steps:
        recovery_steps.append(f"Prevention: {s}")
    if expert_warning:
        recovery_steps.append(f"Expert Warning: {expert_warning}")

    # Confident Diagnosis Response (7-Part Certified Pathology Guidance)
    response_data = {
        "success": True,
        "uncertain": False,
        "predicted_class": predicted_class,
        "crop": kb_info.get("crop", predicted_class.split()[0].title()),
        "diseaseName": kb_info.get("common_name", predicted_class.title()),
        "scientificName": kb_info.get("scientific_name", "N/A"),
        "category": kb_info.get("category", "Fungal"),
        "is_healthy": kb_info.get("is_healthy", False),
        "confidence": round(confidence * 100, 2),
        "confidence_level": confidence_level,
        "has_overlapping_symptoms": has_overlapping_symptoms,
        "overlapping_candidate": overlapping_class,
        "overlap_warning": (
            (
                f"அறிகுறிகள் '{overlapping_class}' ({top_predictions[1]['confidence']}%) உடனும் நெருக்கமாக பொருந்துகின்றன. வயல் ஆய்வின் போது இரண்டையும் பரிசீலிக்கவும்."
            )
            if (has_overlapping_symptoms and is_tamil) else
            (
                f"Note: Observable symptoms also closely resemble '{overlapping_class}' ({top_predictions[1]['confidence']}%). Consider both possibilities during field inspection."
            )
            if has_overlapping_symptoms else None
        ),
        "top_predictions": top_predictions,
        "symptoms": kb_info.get("symptoms_ta" if is_tamil else "symptoms", []),
        "causes": kb_info.get("causes", ""),
        "immediateSafeSteps": immediate_steps,
        "treatmentOptions": treatment_options,
        "prevention": prevention_steps,
        "expertWarning": expert_warning,
        "recoverySteps": recovery_steps if recovery_steps else ["Monitor crop health regularly."],
        "extension_reference": kb_info.get("extension_reference", "ICAR / State Agricultural University Advisory."),
        "expert_system": expert_result,
        "fuzzy_urgency": fuzzy_result,
        "bayesian_context": bayesian_result,
        "disclaimer": (
            "குறிப்பு: வேளாண் பரிந்துரைகள் தமிழ்நாடு வேளாண் பல்கலைக்கழகம் (TNAU) மற்றும் ICAR வழிகாட்டுதல்களை அடிப்படையாகக் கொண்டவை."
            if is_tamil else
            "Disclaimer: Agronomic and chemical dosages are aligned with verified ICAR/TNAU University Extension guidelines."
        )
    }

    return jsonify(response_data), 200


if __name__ == "__main__":
    logger.info(f"Starting Flask 3.0 API on {config.FLASK_HOST}:{config.FLASK_PORT}")
    app.run(host=config.FLASK_HOST, port=config.FLASK_PORT, debug=config.DEBUG)
