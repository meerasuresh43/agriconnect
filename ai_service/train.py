"""
train.py
Transfer Learning Pipeline for Plant Disease Detection using MobileNetV2.
Pretrained on ImageNet, custom classification head, trained on official splits,
and evaluated with precision, recall, F1, and confusion matrix.
"""

import os
import json
import random
import time
from datetime import datetime
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

import config

# Set reproducible random seeds
def set_seeds(seed=config.SEED):
    random.seed(seed)
    np.random.seed(seed)
    tf.random.set_seed(seed)
    os.environ["PYTHONHASHSEED"] = str(seed)
    os.environ["TF_DETERMINISTIC_OPS"] = "1"

set_seeds()


def load_dataset_splits():
    """
    Load images and labels strictly following the official trainval.txt split:
    mode 1 = train, mode 2 = validation, mode 0 = test.
    """
    if not os.path.exists(config.TRAINVAL_FILE):
        raise FileNotFoundError(f"trainval.txt not found at {config.TRAINVAL_FILE}")

    with open(config.TRAINVAL_FILE, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f if line.strip()]

    train_paths, train_labels = [], []
    val_paths, val_labels = [], []
    test_paths, test_labels = [], []

    # Detect all on-disk class folders
    subdirs = sorted([
        d for d in os.listdir(config.IMAGES_DIR)
        if os.path.isdir(os.path.join(config.IMAGES_DIR, d))
    ])
    class_to_idx = {cls_name: i for i, cls_name in enumerate(subdirs)}
    idx_to_class = {i: cls_name for cls_name, i in class_to_idx.items()}

    for line in lines:
        parts = line.split("=")
        if len(parts) == 3:
            rel_path, _, mode = parts
            full_path = os.path.join(config.IMAGES_DIR, rel_path.replace("/", os.sep))
            if os.path.exists(full_path):
                cls_name = parts[0].split("/")[0]
                label_idx = class_to_idx[cls_name]
                if mode == "1":
                    train_paths.append(full_path)
                    train_labels.append(label_idx)
                elif mode == "2":
                    val_paths.append(full_path)
                    val_labels.append(label_idx)
                elif mode == "0":
                    test_paths.append(full_path)
                    test_labels.append(label_idx)

    print(f"Loaded dataset splits:")
    print(f"  Training samples:   {len(train_paths)}")
    print(f"  Validation samples: {len(val_paths)}")
    print(f"  Testing samples:    {len(test_paths)}")
    print(f"  Classes ({len(class_to_idx)}): {list(class_to_idx.keys())}")

    return (
        (train_paths, train_labels),
        (val_paths, val_labels),
        (test_paths, test_labels),
        class_to_idx,
        idx_to_class
    )


def create_tf_dataset(paths, labels, num_classes, is_training=False):
    """
    Build high-performance tf.data.Dataset pipeline with MobileNetV2 preprocessing.
    """
    paths_ds = tf.data.Dataset.from_tensor_slices(paths)
    labels_ds = tf.data.Dataset.from_tensor_slices(
        tf.keras.utils.to_categorical(labels, num_classes=num_classes)
    )
    dataset = tf.data.Dataset.zip((paths_ds, labels_ds))

    def load_and_preprocess(path, label):
        img_bytes = tf.io.read_file(path)
        img = tf.image.decode_jpeg(img_bytes, channels=3)
        img = tf.image.resize(img, config.IMG_SIZE)
        img = tf.keras.applications.mobilenet_v2.preprocess_input(img)
        return img, label

    # Map loading
    dataset = dataset.map(load_and_preprocess, num_parallel_calls=tf.data.AUTOTUNE)

    if is_training:
        # Augmentation for training
        def augment(img, label):
            img = tf.image.random_flip_left_right(img, seed=config.SEED)
            img = tf.image.random_flip_up_down(img, seed=config.SEED)
            img = tf.image.random_brightness(img, max_delta=0.1, seed=config.SEED)
            return img, label

        dataset = dataset.map(augment, num_parallel_calls=tf.data.AUTOTUNE)
        dataset = dataset.shuffle(buffer_size=min(len(paths), 1000), seed=config.SEED)

    dataset = dataset.batch(config.BATCH_SIZE).prefetch(tf.data.AUTOTUNE)
    return dataset


def build_model(num_classes):
    """
    Build transfer learning model with frozen MobileNetV2 backbone
    and customized classification head.
    """
    base_model = tf.keras.applications.MobileNetV2(
        input_shape=(*config.IMG_SIZE, 3),
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False

    inputs = tf.keras.Input(shape=(*config.IMG_SIZE, 3), name="input_image")
    x = base_model(inputs, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D(name="global_avg_pool")(x)
    x = tf.keras.layers.BatchNormalization(name="batch_norm")(x)
    x = tf.keras.layers.Dense(256, activation="relu", name="dense_256")(x)
    x = tf.keras.layers.Dropout(0.4, name="dropout_head")(x)
    outputs = tf.keras.layers.Dense(num_classes, activation="softmax", name="predictions")(x)

    model = tf.keras.Model(inputs=inputs, outputs=outputs, name="AgriConnect_MobileNetV2")

    model.compile(
        optimizer=tf.keras.optimizers.Adam(learning_rate=config.LEARNING_RATE),
        loss="categorical_crossentropy",
        metrics=["accuracy"]
    )

    return model, base_model


def train_and_evaluate():
    """Execute complete training and evaluation pipeline."""
    start_time = time.time()
    os.makedirs(config.MODELS_DIR, exist_ok=True)

    print("====================================================")
    print("PLANT DISEASE DETECTION: MOBILENETV2 TRAINING")
    print("====================================================\n")

    # 1. Load data splits
    (train_data, val_data, test_data, class_to_idx, idx_to_class) = load_dataset_splits()
    train_paths, train_labels = train_data
    val_paths, val_labels = val_data
    test_paths, test_labels = test_data
    num_classes = len(class_to_idx)

    train_ds = create_tf_dataset(train_paths, train_labels, num_classes, is_training=True)
    val_ds = create_tf_dataset(val_paths, val_labels, num_classes, is_training=False)
    test_ds = create_tf_dataset(test_paths, test_labels, num_classes, is_training=False)

    # 2. Build model
    model, base_model = build_model(num_classes)
    model.summary()

    # 3. Callbacks
    callbacks = [
        tf.keras.callbacks.EarlyStopping(
            monitor="val_accuracy",
            patience=4,
            restore_best_weights=True,
            verbose=1
        ),
        tf.keras.callbacks.ReduceLROnPlateau(
            monitor="val_loss",
            factor=0.5,
            patience=2,
            min_lr=1e-5,
            verbose=1
        )
    ]

    # 4. Train custom classification head
    print("\n--- Training Custom Classification Head ---")
    history = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=config.EPOCHS,
        callbacks=callbacks,
        verbose=1
    )

    # 5. Evaluate on Held-out Unseen Test Set
    print("\n--- Evaluating on Unseen Test Set (Mode 0) ---")
    test_paths, test_labels = test_data
    
    # Predict batches
    y_pred_probs = model.predict(test_ds, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = np.array(test_labels)

    class_names = [idx_to_class[i] for i in range(num_classes)]

    # Compute classification report & confusion matrix
    report_dict = classification_report(
        y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0
    )
    conf_matrix = confusion_matrix(y_true, y_pred).tolist()

    overall_acc = float(report_dict["accuracy"])
    macro_f1 = float(report_dict["macro avg"]["f1-score"])
    weighted_f1 = float(report_dict["weighted avg"]["f1-score"])

    print("\n====================================================")
    print("FINAL TEST METRICS ON UNSEEN IMAGES:")
    print("====================================================")
    print(f"Overall Accuracy:  {overall_acc * 100:.2f}%")
    print(f"Macro F1-Score:    {macro_f1 * 100:.2f}%")
    print(f"Weighted F1-Score: {weighted_f1 * 100:.2f}%\n")
    print(classification_report(y_true, y_pred, target_names=class_names, zero_division=0))

    # 6. Save Artifacts Separately
    # 6a. Model
    model.save(config.MODEL_PATH)
    print(f"[SAVED] Trained model: {config.MODEL_PATH}")

    # 6b. Ordered Class-Index Mapping
    with open(config.CLASS_INDICES_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "idx_to_class": idx_to_class,
            "class_to_idx": class_to_idx,
            "classes": class_names,
            "num_classes": num_classes
        }, f, indent=2)
    print(f"[SAVED] Class indices mapping: {config.CLASS_INDICES_PATH}")

    # 6c. Training Configuration
    training_duration = round(time.time() - start_time, 2)
    with open(config.TRAINING_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "architecture": "MobileNetV2 (ImageNet pretrained)",
            "input_shape": [*config.IMG_SIZE, 3],
            "batch_size": config.BATCH_SIZE,
            "learning_rate": config.LEARNING_RATE,
            "epochs_requested": config.EPOCHS,
            "epochs_trained": len(history.history["loss"]),
            "seed": config.SEED,
            "train_samples": len(train_paths),
            "val_samples": len(val_paths),
            "test_samples": len(test_paths),
            "num_classes": num_classes,
            "training_duration_seconds": training_duration,
            "history": {
                "loss": [float(v) for v in history.history["loss"]],
                "accuracy": [float(v) for v in history.history["accuracy"]],
                "val_loss": [float(v) for v in history.history["val_loss"]],
                "val_accuracy": [float(v) for v in history.history["val_accuracy"]],
            }
        }, f, indent=2)
    print(f"[SAVED] Training configuration: {config.TRAINING_CONFIG_PATH}")

    # 6d. Evaluation Report
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
    print(f"[SAVED] Evaluation report: {config.EVALUATION_REPORT_PATH}")

    print("\n====================================================")
    print(f"TRAINING COMPLETED IN {training_duration} SECONDS")
    print("====================================================")

    return overall_acc, report_dict


if __name__ == "__main__":
    train_and_evaluate()
