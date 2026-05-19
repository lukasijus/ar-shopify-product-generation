#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "public" / "models"
MODEL_PATH = MODEL_DIR / "nail-visibility.onnx"
METADATA_PATH = MODEL_DIR / "nail-visibility.metadata.json"
TRAINING_PATH = MODEL_DIR / "nail-visibility.training.json"

FEATURE_NAMES = [
    "bias",
    "isThumb",
    "isIndex",
    "isMiddle",
    "isRing",
    "isPinky",
    "distalLengthNormalized",
    "supportLengthNormalized",
    "distalSupportRatio",
    "extensionDot",
    "wristToTipRatio",
    "edgeSafetyNormalized",
    "tipX",
    "tipY",
    "dipX",
    "dipY",
    "horizontalBias",
    "directionYNormalized",
    "zDelta",
    "nearEdgeFlag",
    "shortSegmentFlag",
    "foldedFingerFlag",
    "tipNotExtendedFlag",
]


def _initial_weights() -> tuple[np.ndarray, np.ndarray]:
    weights = np.zeros((len(FEATURE_NAMES), 1), dtype=np.float32)
    weights[0, 0] = -2.35
    weights[6, 0] = 36.0
    weights[7, 0] = 26.0
    weights[9, 0] = 2.3
    weights[10, 0] = 18.0
    weights[11, 0] = 18.0
    weights[16, 0] = -0.08
    weights[19, 0] = -4.0
    weights[20, 0] = -3.0
    weights[21, 0] = -3.5
    weights[22, 0] = -3.0
    bias = np.array([-17.28], dtype=np.float32)

    return weights, bias


def _sigmoid(value: np.ndarray) -> np.ndarray:
    return 1.0 / (1.0 + np.exp(-np.clip(value, -40, 40)))


def _load_training_rows() -> list[dict]:
    if not TRAINING_PATH.exists():
        return []

    payload = json.loads(TRAINING_PATH.read_text(encoding="utf-8"))

    return [
        row
        for row in payload.get("rows", [])
        if len(row.get("features", [])) == len(FEATURE_NAMES)
    ]


def _score_predictions(
    probabilities: np.ndarray, y: np.ndarray, threshold: float
) -> dict:
    predictions = (probabilities >= threshold).astype(np.float32)
    true_positive = int(((predictions == 1) & (y == 1)).sum())
    true_negative = int(((predictions == 0) & (y == 0)).sum())
    false_positive = int(((predictions == 1) & (y == 0)).sum())
    false_negative = int(((predictions == 0) & (y == 1)).sum())

    return {
        "threshold": threshold,
        "accuracy": float((predictions == y).mean()),
        "truePositive": true_positive,
        "trueNegative": true_negative,
        "falsePositive": false_positive,
        "falseNegative": false_negative,
    }


def _select_threshold(probabilities: np.ndarray, y: np.ndarray) -> dict:
    candidates = [
        _score_predictions(probabilities, y, threshold / 100)
        for threshold in range(35, 81)
    ]

    return min(
        candidates,
        key=lambda metrics: (
            metrics["falsePositive"] + metrics["falseNegative"],
            metrics["falseNegative"],
            metrics["falsePositive"],
            -metrics["accuracy"],
        ),
    )


def _train_from_fixture_rows(
    rows: list[dict],
) -> tuple[np.ndarray, np.ndarray, float, dict]:
    x = np.array([row["features"] for row in rows], dtype=np.float32)
    y = np.array([[row["label"]] for row in rows], dtype=np.float32)
    weights, bias = _initial_weights()

    positive_count = float(y.sum())
    negative_count = float(len(y) - positive_count)
    if positive_count == 0 or negative_count == 0:
        raise ValueError("Training data must include positive and negative labels.")

    class_weights = np.where(
        y == 1,
        len(y) / (2.0 * positive_count),
        len(y) / (2.0 * negative_count),
    )

    learning_rate = 0.18
    regularization = 0.015
    for _ in range(8_000):
        predictions = _sigmoid(x @ weights + bias)
        error = (predictions - y) * class_weights
        gradient_weights = (x.T @ error) / len(y) + regularization * weights
        gradient_bias = np.mean(error, axis=0)
        weights -= learning_rate * gradient_weights
        bias -= learning_rate * gradient_bias

    probabilities = _sigmoid(x @ weights + bias)
    threshold_metrics = _select_threshold(probabilities, y)
    threshold = float(threshold_metrics["threshold"])

    return (
        weights.astype(np.float32),
        bias.astype(np.float32),
        threshold,
        {
            "rowCount": len(rows),
            "positiveCount": int(positive_count),
            "negativeCount": int(negative_count),
            "accuracy": threshold_metrics["accuracy"],
            "truePositive": threshold_metrics["truePositive"],
            "trueNegative": threshold_metrics["trueNegative"],
            "falsePositive": threshold_metrics["falsePositive"],
            "falseNegative": threshold_metrics["falseNegative"],
        },
    )


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    training_rows = _load_training_rows()
    if training_rows:
        weights, bias, threshold, training_metrics = _train_from_fixture_rows(
            training_rows
        )
        model_version = "fixture-trained-v1"
        training_source = "fixture-mediapipe-browser-feature-export"
    else:
        weights, bias = _initial_weights()
        threshold = 0.5
        training_metrics = {
            "rowCount": 0,
            "positiveCount": 0,
            "negativeCount": 0,
            "accuracy": None,
            "truePositive": 0,
            "trueNegative": 0,
            "falsePositive": 0,
            "falseNegative": 0,
        }
        model_version = "heuristic-distilled-v1"
        training_source = "hand-authored heuristic weights"

    feature_input = helper.make_tensor_value_info(
        "features", TensorProto.FLOAT, [None, len(FEATURE_NAMES)]
    )
    probability_output = helper.make_tensor_value_info(
        "probability", TensorProto.FLOAT, [None, 1]
    )

    graph = helper.make_graph(
        [
            helper.make_node("MatMul", ["features", "weights"], ["weighted"]),
            helper.make_node("Add", ["weighted", "bias"], ["logits"]),
            helper.make_node("Sigmoid", ["logits"], ["probability"]),
        ],
        "nail_visibility_distilled_v1",
        [feature_input],
        [probability_output],
        [
            numpy_helper.from_array(weights, name="weights"),
            numpy_helper.from_array(bias, name="bias"),
        ],
    )
    model = helper.make_model(
        graph,
        producer_name="alwayslike-nail-tryon",
        opset_imports=[helper.make_opsetid("", 13)],
    )
    model.ir_version = 8
    onnx.checker.check_model(model)
    onnx.save(model, MODEL_PATH)

    METADATA_PATH.write_text(
        json.dumps(
            {
                "modelVersion": model_version,
                "trainingSource": training_source,
                "modelPath": "/models/nail-visibility.onnx",
                "inputName": "features",
                "outputName": "probability",
                "featureNames": FEATURE_NAMES,
                "threshold": threshold,
                "trainingMetrics": training_metrics,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MODEL_PATH.relative_to(ROOT)}")
    print(f"Wrote {METADATA_PATH.relative_to(ROOT)}")
    print(
        "Training rows: "
        f"{training_metrics['rowCount']} "
        f"(accuracy: {training_metrics['accuracy']})"
    )


if __name__ == "__main__":
    main()
