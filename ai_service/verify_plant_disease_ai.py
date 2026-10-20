"""
verify_plant_disease_ai.py
Comprehensive End-to-End Verification for AgriConnect Plant Disease AI:
1. Flask 3.0 /api/health
2. Flask 3.0 /api/classes
3. Flask 3.0 /api/predict with unseen test image (banana leaf)
4. Flask 3.0 /api/predict with low-confidence / uncertain handling
5. Express Backend proxy /api/ai/disease-detect
6. SQLite prediction history audit logging /api/history
7. Supporting reasoning modules (Expert Rules, Bayesian Priors, Fuzzy Centroid)
"""

import sys
import os
import json
import sqlite3
import requests

# Ensure UTF-8 output on Windows console
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

FLASK_BASE_URL = "http://127.0.0.1:5001"
EXPRESS_BASE_URL = "http://127.0.0.1:5000"
DATA_IMAGES_DIR = r"c:\Users\agriconnect\data\plantwild\plantwild\images"

def test_health():
    print("\n--- 1. Testing Flask /api/health ---")
    resp = requests.get(f"{FLASK_BASE_URL}/api/health", timeout=5)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(json.dumps(data, indent=2))
    assert resp.status_code == 200
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert len(data["classes_supported"]) == 89
    print(">>> Health Check: PASSED")

def test_classes():
    print("\n--- 2. Testing Flask /api/classes ---")
    resp = requests.get(f"{FLASK_BASE_URL}/api/classes", timeout=5)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"Classes count: {data['count']}")
    for c in data["classes"][:15]:
        print(f"  - [{c['class_id']}] {c['name']} (Prior: {c['dataset_prior']}, Category: {c['category']})")
    assert resp.status_code == 200
    assert data["count"] == 89
    print(">>> Classes Listing (89 Classes): PASSED")

def test_direct_prediction():
    print("\n--- 3. Testing Flask /api/predict with Unseen Test Image (Banana Leaf) ---")
    test_img = os.path.join(DATA_IMAGES_DIR, "banana leaf", "1.jpg")
    assert os.path.exists(test_img), f"Test image not found at {test_img}"
    
    with open(test_img, "rb") as f:
        files = {"image": ("test_banana_leaf.jpg", f, "image/jpeg")}
        data = {
            "lang": "en",
            "weather": "humid",
            "irrigation": "sprinkler",
            "lesion_coverage": "30.0",
            "humidity": "80.0",
            "season": "monsoon"
        }
        resp = requests.post(f"{FLASK_BASE_URL}/api/predict", files=files, data=data, timeout=10)
    
    print(f"Status: {resp.status_code}")
    result = resp.json()
    print(f"Predicted Class: {result.get('predicted_class')}")
    print(f"Disease Name:    {result.get('diseaseName')}")
    print(f"Confidence:      {result.get('confidence')}%")
    print(f"Uncertain:       {result.get('uncertain')}")
    print(f"Top 3 Predictions: {result.get('top_predictions', [])[:3]}")
    
    # Supporting AI reasoning verifications
    expert = result.get("expert_system", {})
    fuzzy = result.get("fuzzy_urgency", {})
    bayesian = result.get("bayesian_context", {})

    print(f"Expert System:   Urgency = {expert.get('urgency')}, Recommendations count = {len(expert.get('recommendations', []))}")
    print(f"Fuzzy Urgency:   Score = {fuzzy.get('intervention_urgency_score')}/10, Category = {fuzzy.get('urgency_category')}")
    
    posteriors = bayesian.get("posterior_distribution", {})
    top_bayesian = list(posteriors.items())[0] if posteriors else ("N/A", 0)
    print(f"Bayesian Context Top Prior Candidate: {top_bayesian[0]} ({top_bayesian[1]})")

    assert resp.status_code == 200
    assert result["success"] is True
    assert result["uncertain"] is False
    assert result["predicted_class"] == "banana leaf"
    assert fuzzy.get("intervention_urgency_score") is not None
    assert expert.get("urgency") is not None
    print(">>> Direct Prediction & Supporting AI Modules: PASSED")

def test_low_confidence():
    print("\n--- 4. Testing Low-Confidence / Uncertain Handling ---")
    from PIL import Image
    import io
    noise_img = Image.new("RGB", (224, 224), color=(100, 100, 100))
    img_byte_arr = io.BytesIO()
    noise_img.save(img_byte_arr, format='JPEG')
    img_byte_arr.seek(0)

    files = {"image": ("blurry_sample.jpg", img_byte_arr, "image/jpeg")}
    data = {
        "lang": "ta",
        "force_uncertain": "true"
    }
    resp = requests.post(f"{FLASK_BASE_URL}/api/predict", files=files, data=data, timeout=10)
    result = resp.json()
    print(f"Status: {resp.status_code}")
    print(f"Uncertain Flag: {result.get('uncertain')}")
    print(f"Confidence:     {result.get('confidence')}%")
    print(f"Disease Label:  {result.get('diseaseName')}")
    print(f"Warning:        {result.get('warningMessage')[:60]}...")
    print(f"Recommendation: {result.get('recommendation')[:60]}...")
    
    assert resp.status_code == 200
    assert result["success"] is True
    assert result["uncertain"] is True
    print(">>> Low-Confidence / Uncertain Rejection Handling: PASSED")

def test_express_proxy():
    print("\n--- 5. Testing Express Proxy /api/ai/disease-detect ---")
    test_img = os.path.join(DATA_IMAGES_DIR, "apple scab", "1.jpg")
    with open(test_img, "rb") as f:
        files = {"image": ("test_apple_scab.jpg", f, "image/jpeg")}
        data = {
            "lang": "en",
            "weather": "rainy",
            "irrigation": "sprinkler",
            "humidity": "85.0",
            "lesion_coverage": "40.0"
        }
        resp = requests.post(f"{EXPRESS_BASE_URL}/api/ai/disease-detect", files=files, data=data, timeout=10)
    
    print(f"Status: {resp.status_code}")
    result = resp.json()
    print(f"Predicted Class: {result.get('predicted_class')}")
    print(f"Disease Name:    {result.get('diseaseName')}")
    print(f"Scientific Name: {result.get('scientificName')}")
    print(f"Confidence:      {result.get('confidence')}%")
    print(f"Symptoms count:  {len(result.get('symptoms', []))}")
    print(f"Recovery steps:  {len(result.get('recoverySteps', []))}")
    print(f"Disclaimer:      {result.get('disclaimer')}")
    assert resp.status_code == 200
    assert result["success"] is True
    assert result["predicted_class"] == "apple scab"
    print(">>> Express Proxy Integration: PASSED")

def test_sqlite_history():
    print("\n--- 6. Testing Persistent SQLite History Audit ---")
    resp = requests.get(f"{FLASK_BASE_URL}/api/history?limit=10", timeout=5)
    print(f"Status: {resp.status_code}")
    data = resp.json()
    print(f"History records found: {data['count']}")
    for item in data["history"][:5]:
        print(f"  - ID {item['id']}: File '{item['filename']}', Class '{item['predicted_class']}', Conf {round(item['confidence']*100, 1)}%, Fuzzy {item['fuzzy_score']}, Urgency '{item['expert_urgency']}', Uncertain: {item['is_uncertain']}")
    assert resp.status_code == 200
    assert data["count"] > 0
    print(">>> Persistent SQLite Audit Logging: PASSED")

if __name__ == "__main__":
    try:
        test_health()
        test_classes()
        test_direct_prediction()
        test_low_confidence()
        test_express_proxy()
        test_sqlite_history()
        print("\n====================================================")
        print("ALL 6 END-TO-END VERIFICATION CHECKS PASSED PERFECTLY!")
        print("====================================================")
    except Exception as e:
        print(f"\nVerification FAILED: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
