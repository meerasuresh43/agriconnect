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

    # Optional query parameters from farmer
    lang = request.form.get("lang", "en")
    weather = request.form.get("weather", "normal")
    irrigation = request.form.get("irrigation", "drip")
    has_alternate_hosts = request.form.get("has_alternate_hosts", "false").lower() == "true"
    lesion_coverage = float(request.form.get("lesion_coverage", 25.0))
    humidity = float(request.form.get("humidity", 65.0))
    season = request.form.get("season", "spring")

    # 3. Preprocess for MobileNetV2 (224x224 RGB, [-1, 1] range)
    img_resized = image.resize(config.IMG_SIZE, Image.Resampling.BILINEAR)
    img_arr = np.array(img_resized, dtype=np.float32)
    img_preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(img_arr)
    img_batch = np.expand_dims(img_preprocessed, axis=0)

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

    # 5. Handle Low Confidence / Uncertain Results
    threshold = float(request.form.get("threshold", config.CONFIDENCE_THRESHOLD))
    force_uncertain = request.form.get("force_uncertain", "false").lower() == "true"
    is_uncertain = (confidence < threshold) or force_uncertain

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
            "diseaseName": "தெளிவற்ற முடிவுகள் / குறைந்த AI நம்பிக்கை" if is_tamil else "Uncertain Result / Low AI Confidence",
            "predicted_class": predicted_class,
            "warningMessage": (
                "⚠️ AI மாதிரியின் நம்பிக்கை குறைவாக உள்ளது (60% க்கும் குறைவு). "
                "இலைப்படம் மங்கலாக இருக்கலாம் அல்லது பூச்சிக் காயம்/சத்து குறைபாடு இருக்கலாம். "
                "தயவுசெய்து அருகிலுள்ள வேளாண் அறிவியல் மையத்தை (KVK) அணுகவும்."
                if is_tamil else
                f"⚠️ The AI visual confidence is low ({round(confidence * 100, 1)}%, threshold: 60%). "
                "The leaf image may be out of focus, blurry, or showing overlapping nutrient symptoms. "
                "We recommend consulting an agricultural extension officer or KVK specialist before applying chemicals."
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

    # Confident Diagnosis Response
    response_data = {
        "success": True,
        "uncertain": False,
        "predicted_class": predicted_class,
        "diseaseName": kb_info.get("common_name", predicted_class.title()),
        "scientificName": kb_info.get("scientific_name", "N/A"),
        "category": kb_info.get("category", "Fungal"),
        "is_healthy": kb_info.get("is_healthy", False),
        "confidence": round(confidence * 100, 2),
        "top_predictions": top_predictions,
        "symptoms": kb_info.get("symptoms_ta" if is_tamil else "symptoms", []),
        "causes": kb_info.get("causes", ""),
        "prevention": kb_info.get("prevention", []),
        "recoverySteps": kb_info.get("recovery_steps", []),
        "extension_reference": kb_info.get("extension_reference", ""),
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
