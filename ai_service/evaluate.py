import os
import json
from datetime import datetime
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

import config
from train_89 import load_split_paths


def run_evaluation():
    print("Loading official dataset splits and trained 89-class MobileNetV2 model...")
    train_data, val_data, test_data, class_to_idx, idx_to_class = load_split_paths()
    test_paths, test_labels = test_data
    num_classes = len(class_to_idx)
    class_names = [idx_to_class[i] for i in range(num_classes)]

    print(f"Loading trained model from {config.MODEL_PATH}...")
    model = tf.keras.models.load_model(config.MODEL_PATH)

    def load_raw_img(path, label):
        raw = tf.io.read_file(path)
        img = tf.image.decode_jpeg(raw, channels=3)
        img = tf.image.resize(img, config.IMG_SIZE)
        # Note: Model internally applies mobilenet_v2.preprocess_input
        return img, label

    test_ds = tf.data.Dataset.from_tensor_slices((test_paths, test_labels))
    test_ds = test_ds.map(load_raw_img, num_parallel_calls=tf.data.AUTOTUNE)
    test_ds = test_ds.batch(config.BATCH_SIZE).prefetch(tf.data.AUTOTUNE)

    print(f"Evaluating model on {len(test_paths)} unseen test images...")
    y_pred_probs = model.predict(test_ds, verbose=1)
    y_pred = np.argmax(y_pred_probs, axis=1)
    y_true = np.array(test_labels)

    report_dict = classification_report(
        y_true, y_pred, target_names=class_names, output_dict=True, zero_division=0
    )
    conf_matrix = confusion_matrix(y_true, y_pred).tolist()

    overall_acc = float(report_dict["accuracy"])
    macro_f1 = float(report_dict["macro avg"]["f1-score"])
    weighted_f1 = float(report_dict["weighted avg"]["f1-score"])

    print("\n====================================================")
    print("TEST SET EVALUATION RESULTS (89 CLASSES):")
    print("====================================================")
    print(f"Overall Accuracy:  {overall_acc * 100:.2f}%")
    print(f"Macro F1-Score:    {macro_f1 * 100:.2f}%")
    print(f"Weighted F1-Score: {weighted_f1 * 100:.2f}%\n")

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
    print(f"[SAVED] Evaluation report: {config.EVALUATION_REPORT_PATH}")


if __name__ == "__main__":
    run_evaluation()


if __name__ == "__main__":
    run_evaluation()
