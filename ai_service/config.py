import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)

# Dataset paths
DATA_ROOT = os.path.join(PROJECT_ROOT, "data", "plantwild", "plantwild")
IMAGES_DIR = os.path.join(DATA_ROOT, "images")
TRAINVAL_FILE = os.path.join(DATA_ROOT, "trainval.txt")
CLASSES_FILE = os.path.join(DATA_ROOT, "classes.txt")

# Model artifact paths
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "plant_disease_mobilenetv2.keras")
CLASS_INDICES_PATH = os.path.join(MODELS_DIR, "class_indices.json")
TRAINING_CONFIG_PATH = os.path.join(MODELS_DIR, "training_config.json")
EVALUATION_REPORT_PATH = os.path.join(MODELS_DIR, "evaluation_report.json")

# Database path for prediction audit history
DB_PATH = os.path.join(BASE_DIR, "predictions.db")

# Model hyperparameters
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
LEARNING_RATE = 1e-3
EPOCHS = 10
SEED = 42

# Thresholds (89-class calibrated threshold; uniform prior is 1.12%)
CONFIDENCE_THRESHOLD = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.35"))
MAX_CONTENT_LENGTH = 10 * 1024 * 1024  # 10 MB limit
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# Server configuration
FLASK_HOST = os.environ.get("FLASK_HOST", "0.0.0.0")
FLASK_PORT = int(os.environ.get("FLASK_PORT", 5001))
DEBUG = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
