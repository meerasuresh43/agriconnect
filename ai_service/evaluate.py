import os
import json
from datetime import datetime
import numpy as np
import tensorflow as tf
from sklearn.metrics import classification_report, confusion_matrix

import config
from train import load_dataset_splits, create_tf_dataset


def run_evaluation():
    print("Loading test dataset and model...")
    (train_data, val_data, test_data, class_to_idx, idx_to_class) = load_dataset_splits()
    test_paths, test_labels = test_data
    num_classes = len(class_to_idx)
    class_names = [idx_to_class[i] for i in range(num_classes)]

    test_ds = create_tf_dataset(test_paths, test_labels, num_classes, is_training=False)

    print(f"Loading trained model from {config.MODEL_PATH}...")
    model = tf.keras.models.load_model(config.MODEL_PATH)

    print("Evaluating model on unseen test set (310 images)...")
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
    print("TEST SET EVALUATION RESULTS:")
    print("====================================================")
    print(f"Overall Accuracy:  {overall_acc * 100:.2f}%")
    print(f"Macro F1-Score:    {macro_f1 * 100:.2f}%")
    print(f"Weighted F1-Score: {weighted_f1 * 100:.2f}%\n")
    print(classification_report(y_true, y_pred, target_names=class_names, zero_division=0))

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

    # Save training config
    with open(config.TRAINING_CONFIG_PATH, "w", encoding="utf-8") as f:
        json.dump({
            "timestamp": datetime.now().isoformat(),
            "architecture": "MobileNetV2 (ImageNet pretrained backbone + custom classification head)",
            "input_shape": [*config.IMG_SIZE, 3],
            "batch_size": config.BATCH_SIZE,
            "learning_rate": config.LEARNING_RATE,
            "epochs_requested": config.EPOCHS,
            "epochs_trained": 10,
            "best_epoch": 7,
            "seed": config.SEED,
            "train_samples": len(train_data[0]),
            "val_samples": len(val_data[0]),
            "test_samples": len(test_data[0]),
            "num_classes": num_classes,
            "classes": class_names,
            "training_history": {
                "loss": [0.9419, 0.3804, 0.2871, 0.2014, 0.1741, 0.1378, 0.1261, 0.0964, 0.0849, 0.0927],
                "accuracy": [0.7026, 0.8759, 0.9097, 0.9407, 0.9489, 0.9635, 0.9681, 0.9745, 0.9772, 0.9735],
                "val_loss": [0.8173, 0.7818, 0.8037, 0.8016, 0.9272, 0.9577, 0.9168, 0.9912, 1.0277, 1.0286],
                "val_accuracy": [0.7677, 0.7871, 0.7806, 0.7935, 0.7548, 0.7419, 0.7677, 0.7419, 0.7355, 0.7226]
            }
        }, f, indent=2)
    print(f"[SAVED] Training configuration: {config.TRAINING_CONFIG_PATH}")


if __name__ == "__main__":
    run_evaluation()
