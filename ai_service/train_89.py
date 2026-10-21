"""
train_89.py
High-Performance Transfer Learning Pipeline for All 89 PlantWild Classes.
1. Extracts MobileNetV2 ImageNet feature embeddings on official trainval.txt splits.
2. Trains a deep regularized classification head with balanced class weights.
3. Assembles the complete end-to-end MobileNetV2 Keras model.
4. Evaluates on 3,677 held-out test images with precision, recall, and F1.
5. Verifies predictions on real-world user-uploaded crop images.
"""

import os
import sys
import json
import time
from datetime import datetime
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix
from sklearn.utils.class_weight import compute_class_weight

import config

# Set random seeds
SEED = config.SEED
np.random.seed(SEED)
tf.random.set_seed(SEED)

def load_split_paths():
    """Load train, val, and test file paths strictly from official trainval.txt."""
    with open(config.TRAINVAL_FILE, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    # Ordered classes from classes.txt
    with open(config.CLASSES_FILE, "r", encoding="utf-8") as f:
        classes = [line.strip().split(maxsplit=1)[1] for line in f if line.strip()]

    class_to_idx = {c: i for i, c in enumerate(classes)}
    idx_to_class = {i: c for i, c in enumerate(classes)}

    train_paths, train_labels = [], []
    val_paths, val_labels = [], []
    test_paths, test_labels = [], []

    for line in lines:
        parts = line.split("=")
        if len(parts) == 3:
            rel_path, cid_str, mode = parts
            full_path = os.path.join(config.IMAGES_DIR, rel_path.replace("/", os.sep))
            if os.path.exists(full_path):
                cid = int(cid_str)
                if mode == "1":
                    train_paths.append(full_path)
                    train_labels.append(cid)
                elif mode == "2":
                    val_paths.append(full_path)
                    val_labels.append(cid)
                elif mode == "0":
                    test_paths.append(full_path)
                    test_labels.append(cid)

    print(f"Dataset summary across {len(classes)} classes:")
    print(f"  Train samples: {len(train_paths)}")
    print(f"  Val samples:   {len(val_paths)}")
    print(f"  Test samples:  {len(test_paths)}")
    return (train_paths, train_labels), (val_paths, val_labels), (test_paths, test_labels), class_to_idx, idx_to_class


def extract_features(paths, base_model, batch_size=64):
    """Extract 1280-dim feature vectors from images using MobileNetV2 backbone."""
    def load_img(path):
        raw = tf.io.read_file(path)
        img = tf.image.decode_jpeg(raw, channels=3)
        img = tf.image.resize(img, config.IMG_SIZE)
        img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
        return img

    ds = tf.data.Dataset.from_tensor_slices(paths)
    ds = ds.map(load_img, num_parallel_calls=tf.data.AUTOTUNE)
    ds = ds.batch(batch_size).prefetch(tf.data.AUTOTUNE)

    features = []
    total_batches = (len(paths) + batch_size - 1) // batch_size
    print(f"Extracting features for {len(paths)} images in {total_batches} batches...")
    
    t0 = time.time()
    for b_idx, batch in enumerate(ds):
        feats = base_model(batch, training=False)
        features.append(feats.numpy())
        if (b_idx + 1) % 25 == 0 or (b_idx + 1) == total_batches:
            done = min((b_idx + 1) * batch_size, len(paths))
            rate = done / max(time.time() - t0, 0.001)
            print(f"  Processed {done}/{len(paths)} images ({rate:.1f} img/s)...")

    return np.vstack(features)


def train_89_model():
    start_time = time.time()
    os.makedirs(config.MODELS_DIR, exist_ok=True)
    cache_dir = os.path.join(config.MODELS_DIR, "cache")
    os.makedirs(cache_dir, exist_ok=True)

    print("====================================================")
    print("AGRICONNECT AI: TRAINING 89-CLASS PLANT DISEASE MODEL")
    print("====================================================\n")

    # 1. Load official dataset splits
    train_data, val_data, test_data, class_to_idx, idx_to_class = load_split_paths()
    num_classes = len(class_to_idx)
    class_names = [idx_to_class[i] for i in range(num_classes)]

    # 2. Build MobileNetV2 Feature Extractor
    print("\n--- Phase 1: MobileNetV2 Backbone Initialization ---")
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*config.IMG_SIZE, 3),
        include_top=False,
        pooling="avg",
        weights="imagenet"
    )
    base_model.trainable = False

    # 3. Extract or load cached feature embeddings
    train_feat_file = os.path.join(cache_dir, "train_feat.npy")
    val_feat_file = os.path.join(cache_dir, "val_feat.npy")
    test_feat_file = os.path.join(cache_dir, "test_feat.npy")

    if os.path.exists(train_feat_file) and os.path.exists(val_feat_file) and os.path.exists(test_feat_file):
        print(f"Loading cached feature embeddings from {cache_dir}...")
        X_train = np.load(train_feat_file)
        X_val = np.load(val_feat_file)
        X_test = np.load(test_feat_file)
    else:
        print("Extracting feature embeddings across splits...")
        X_train = extract_features(train_data[0], base_model)
        np.save(train_feat_file, X_train)
        X_val = extract_features(val_data[0], base_model)
        np.save(val_feat_file, X_val)
        X_test = extract_features(test_data[0], base_model)
        np.save(test_feat_file, X_test)

    y_train = np.array(train_data[1])
    y_val = np.array(val_data[1])
    y_test = np.array(test_data[1])

    print(f"Features ready: Train={X_train.shape}, Val={X_val.shape}, Test={X_test.shape}")

    # 4. Compute balanced class weights
    unique_classes = np.unique(y_train)
    weights = compute_class_weight("balanced", classes=unique_classes, y=y_train)
    class_weights = {cls: float(w) for cls, w in zip(unique_classes, weights)}

    # 5. Build and train custom classification head
    print("\n--- Phase 2: Training Deep Classification Head ---")
    head_input = tf.keras.Input(shape=(1280,), name="features_input")
    x = tf.keras.layers.Dense(512, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(1e-4))(head_input)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.4)(x)
    x = tf.keras.layers.Dense(256, activation="relu", kernel_regularizer=tf.keras.regularizers.l2(1e-4))(x)
    x = tf.keras.layers.BatchNormalization()(x)
    x = tf.keras.layers.Dropout(0.3)(x)
    head_output = tf.keras.layers.Dense(num_classes, activation="softmax", name="class_probabilities")(x)
    head_model = tf.keras.Model(head_input, head_output, name="classification_head")

    head_model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=0.001),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=8,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=3,
            min_lr=1e-5,
            verbose=1
        )
    ]

    history = head_model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=40,
        batch_size=64,
        class_weight=class_weights,
        callbacks=callbacks,
        verbose=1
    )

    # 6. Assemble Full End-to-End Keras Model
    print("\n--- Phase 3: Assembling End-to-End MobileNetV2 Model ---")
    full_input = tf.keras.Input(shape=(*config.IMG_SIZE, 3), name="input_image")
    preprocessed = tf.keras.applications.mobilenet_v2.preprocess_input(full_input)
    features = base_model(preprocessed)
    full_output = head_model(features)
    end_to_end_model = tf.keras.Model(inputs=full_input, outputs=full_output, name="AgriConnect_MobileNetV2_89")

    # Save trained model
    end_to_end_model.save(config.MODEL_PATH)
    print(f"[SAVED] Production model saved: {config.MODEL_PATH}")

    # Save class indices
    with open(config.CLASS_INDICES_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "idx_to_class": idx_to_class,
            "class_to_idx": class_to_idx,
            "classes": class_names,
            "num_classes": num_classes
        }, f, indent=2)
    print(f"[SAVED] Class indices saved: {config.CLASS_INDICES_PATH}")

    # 7. Evaluate on Held-Out Test Set (3,677 Unseen Images)
    print("\n--- Phase 4: Evaluating on Held-Out Test Set (3,677 Images) ---")
    y_pred_probs = head_model.predict(X_test, verbose=0)
    y_pred = np.argmax(y_pred_probs, axis=1)

    report_dict = classification_report(
        y_test, y_pred, target_names=class_names, output_dict=True, zero_division=0
    )
    conf_matrix = confusion_matrix(y_test, y_pred).tolist()

    overall_acc = float(report_dict["accuracy"])
    macro_f1 = float(report_dict["macro avg"]["f1-score"])
    weighted_f1 = float(report_dict["weighted avg"]["f1-score"])

    print("====================================================")
    print(f"TEST ACCURACY ON 89 CLASSES: {overall_acc * 100:.2f}%")
    print(f"MACRO F1-SCORE:              {macro_f1 * 100:.2f}%")
    print(f"WEIGHTED F1-SCORE:           {weighted_f1 * 100:.2f}%")
    print("====================================================\n")

    # Save evaluation report
    with open(config.EVALUATION_REPORT_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "overall_accuracy": overall_acc,
            "macro_avg": report_dict["macro avg"],
            "weighted_avg": report_dict["weighted avg"],
            "per_class_metrics": {c: report_dict[c] for c in class_names if c in report_dict},
            "confusion_matrix": conf_matrix,
            "class_order": class_names
        }, f, indent=2)
    print(f"[SAVED] Evaluation report saved: {config.EVALUATION_REPORT_PATH}")

    # Save training configuration
    duration = round(time.time() - start_time, 2)
    with open(config.TRAINING_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "architecture": "MobileNetV2 (ImageNet Pretrained) + Deep Dense Head (512-256-89)",
            "num_classes": num_classes,
            "input_shape": [*config.IMG_SIZE, 3],
            "train_samples": len(y_train),
            "val_samples": len(y_val),
            "test_samples": len(y_test),
            "duration_seconds": duration,
            "epochs_trained": len(history.history["loss"]),
            "history": {
                "loss": [float(v) for v in history.history["loss"]],
                "accuracy": [float(v) for v in history.history["accuracy"]],
                "val_loss": [float(v) for v in history.history["val_loss"]],
                "val_accuracy": [float(v) for v in history.history["val_accuracy"]]
            }
        }, f, indent=2)
    print(f"[SAVED] Training config saved: {config.TRAINING_CONFIG_PATH}")

    # 8. Test on User Uploaded Test Images
    print("\n--- Phase 5: Testing on Real User Uploaded Images ---")
    from PIL import Image

    user_tests = [
        ("bean-blight.jpg", "backend/uploads/image-1792332900781-230288184.jpg"),
        ("early-blight-tomato-leaf.webp", "backend/uploads/image-1792332932943-586688715.webp"),
        ("cauliflower-black-rot.jpg", "backend/uploads/image-1792332911006-510817998.jpg"),
        ("ginger-leaf.jpg", "backend/uploads/image-1792332944456-220926179.jpg")
    ]

    for label, path in user_tests:
        if os.path.exists(path):
            im = Image.open(path).convert("RGB").resize(config.IMG_SIZE)
            arr = np.expand_dims(np.array(im, dtype=np.float32), 0)
            preds = end_to_end_model.predict(arr, verbose=0)[0]
            top_indices = np.argsort(preds)[::-1][:3]
            print(f"\nUser Image: '{label}'")
            for rank, idx in enumerate(top_indices, 1):
                print(f"  #{rank}: {class_names[idx]:32} ({preds[idx]*100:.2f}%)")

    print(f"\nTraining and verification completed in {duration} seconds.")


if __name__ == "__main__":
    train_89_model()
