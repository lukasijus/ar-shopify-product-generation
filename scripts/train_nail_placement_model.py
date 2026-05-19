#!/usr/bin/env python3
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import onnx
from onnx import TensorProto, helper, numpy_helper

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "public" / "models"
MODEL_PATH = MODEL_DIR / "nail-placement.onnx"
METADATA_PATH = MODEL_DIR / "nail-placement.metadata.json"
TRAINING_PATH = MODEL_DIR / "nail-placement.training.json"

FEATURE_NAMES = [
    "bias",
    "isThumb",
    "isIndex",
    "isMiddle",
    "isRing",
    "isPinky",
    "tipX",
    "tipY",
    "dipX",
    "dipY",
    "pipX",
    "pipY",
    "distalLengthNormalized",
    "supportLengthNormalized",
    "distalSupportRatio",
    "extensionDot",
    "wristToTipRatio",
    "edgeSafetyNormalized",
    "horizontalBias",
    "directionXNormalized",
    "directionYNormalized",
    "overlayCenterXNormalized",
    "overlayCenterYNormalized",
    "overlayWidthNormalized",
    "overlayHeightNormalized",
    "overlayAngleSin",
    "overlayAngleCos",
    "visibilityConfidence",
]

OUTPUT_NAMES = [
    "centerDxRatio",
    "centerDyRatio",
    "widthScaleDelta",
    "heightScaleDelta",
    "angleDeltaRadians",
    "frontLogit",
    "slightLeftLogit",
    "slightRightLogit",
    "angledLeftLogit",
    "angledRightLogit",
    "sideLogit",
]

VARIANT_COUNT = 6


def _load_rows() -> list[dict]:
    if not TRAINING_PATH.exists():
        return []

    payload = json.loads(TRAINING_PATH.read_text(encoding="utf-8"))
    return [
        row
        for row in payload.get("rows", [])
        if row.get("label") == 1 and len(row.get("features", [])) == len(FEATURE_NAMES)
    ]


def _target_for_row(row: dict, augmentation_index: int) -> np.ndarray:
    features = row["features"]
    heuristic = row["heuristic"]
    is_thumb = features[1] == 1
    horizontal_bias = features[18]
    edge_safety = features[17]
    distal_support_ratio = features[14]
    variant_index = int(heuristic["variantIndex"])

    # Deterministic synthetic label: keep close to the current geometry but
    # teach modest pose-aware calibration. The model remains a refiner.
    center_dx = 0.0
    center_dy = -0.035
    width_delta = -0.04
    height_delta = -0.06
    angle_delta = 0.0

    if is_thumb:
        center_dx += 0.035 if features[19] >= 0 else -0.035
        center_dy += 0.015
        width_delta += 0.02

    if horizontal_bias > 0.58:
        center_dx += 0.025 if features[19] >= 0 else -0.025
        width_delta -= 0.035
        height_delta -= 0.025
        angle_delta += 0.035 if features[19] >= 0 else -0.035

    if horizontal_bias > 0.92:
        width_delta -= 0.05
        height_delta -= 0.04

    if edge_safety < 0.04:
        center_dy += 0.025
        height_delta -= 0.06

    if distal_support_ratio < 0.66:
        height_delta -= 0.04

    jitter = ((augmentation_index % 5) - 2) / 2
    center_dx += jitter * 0.012
    center_dy += math.sin(augmentation_index * 1.7) * 0.01
    width_delta += math.cos(augmentation_index * 1.3) * 0.012
    height_delta += math.sin(augmentation_index * 1.1) * 0.012
    angle_delta += math.sin(augmentation_index * 0.9) * 0.025

    target = np.zeros((len(OUTPUT_NAMES),), dtype=np.float32)
    target[0] = np.clip(center_dx, -0.16, 0.16)
    target[1] = np.clip(center_dy, -0.16, 0.16)
    target[2] = np.clip(width_delta, -0.18, 0.16)
    target[3] = np.clip(height_delta, -0.18, 0.16)
    target[4] = np.clip(angle_delta, -0.18, 0.18)
    target[5 + max(0, min(variant_index, VARIANT_COUNT - 1))] = 1.0
    return target


def _build_dataset(rows: list[dict]) -> tuple[np.ndarray, np.ndarray]:
    features: list[list[float]] = []
    targets: list[np.ndarray] = []
    for row in rows:
        for augmentation_index in range(9):
            features.append(row["features"])
            targets.append(_target_for_row(row, augmentation_index))

    return np.array(features, dtype=np.float32), np.array(targets, dtype=np.float32)


def _train_mlp(
    x: np.ndarray, y: np.ndarray
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, dict]:
    rng = np.random.default_rng(42)
    hidden_size = 18
    w1 = rng.normal(0, 0.08, size=(x.shape[1], hidden_size)).astype(np.float32)
    b1 = np.zeros((hidden_size,), dtype=np.float32)
    w2 = rng.normal(0, 0.08, size=(hidden_size, y.shape[1])).astype(np.float32)
    b2 = np.zeros((y.shape[1],), dtype=np.float32)

    learning_rate = 0.035
    regularization = 0.002
    for _ in range(5_000):
        hidden_raw = x @ w1 + b1
        hidden = np.maximum(hidden_raw, 0)
        prediction = hidden @ w2 + b2
        error = prediction - y
        grad_prediction = (2.0 / len(x)) * error
        grad_w2 = hidden.T @ grad_prediction + regularization * w2
        grad_b2 = grad_prediction.sum(axis=0)
        grad_hidden = grad_prediction @ w2.T
        grad_hidden[hidden_raw <= 0] = 0
        grad_w1 = x.T @ grad_hidden + regularization * w1
        grad_b1 = grad_hidden.sum(axis=0)

        w1 -= learning_rate * grad_w1
        b1 -= learning_rate * grad_b1
        w2 -= learning_rate * grad_w2
        b2 -= learning_rate * grad_b2

    hidden = np.maximum(x @ w1 + b1, 0)
    prediction = hidden @ w2 + b2
    correction_mae = float(np.mean(np.abs(prediction[:, :5] - y[:, :5])))
    variant_accuracy = float(
        (np.argmax(prediction[:, 5:], axis=1) == np.argmax(y[:, 5:], axis=1)).mean()
    )

    return (
        w1.astype(np.float32),
        b1.astype(np.float32),
        w2.astype(np.float32),
        b2.astype(np.float32),
        {
            "rowCount": int(len(x)),
            "sourceRowCount": int(len(x) / 9),
            "correctionMeanAbsoluteError": correction_mae,
            "variantAccuracy": variant_accuracy,
        },
    )


def _write_model(
    w1: np.ndarray, b1: np.ndarray, w2: np.ndarray, b2: np.ndarray
) -> None:
    feature_input = helper.make_tensor_value_info(
        "features", TensorProto.FLOAT, [None, len(FEATURE_NAMES)]
    )
    placement_output = helper.make_tensor_value_info(
        "placement", TensorProto.FLOAT, [None, len(OUTPUT_NAMES)]
    )
    graph = helper.make_graph(
        [
            helper.make_node("MatMul", ["features", "w1"], ["hidden_weighted"]),
            helper.make_node("Add", ["hidden_weighted", "b1"], ["hidden_raw"]),
            helper.make_node("Relu", ["hidden_raw"], ["hidden"]),
            helper.make_node("MatMul", ["hidden", "w2"], ["output_weighted"]),
            helper.make_node("Add", ["output_weighted", "b2"], ["placement"]),
        ],
        "nail_placement_refiner_v1",
        [feature_input],
        [placement_output],
        [
            numpy_helper.from_array(w1, name="w1"),
            numpy_helper.from_array(b1, name="b1"),
            numpy_helper.from_array(w2, name="w2"),
            numpy_helper.from_array(b2, name="b2"),
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


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    rows = _load_rows()
    if not rows:
        raise SystemExit("No positive placement training rows found.")

    x, y = _build_dataset(rows)
    w1, b1, w2, b2, metrics = _train_mlp(x, y)
    _write_model(w1, b1, w2, b2)

    METADATA_PATH.write_text(
        json.dumps(
            {
                "modelVersion": "fixture-placement-mlp-v1",
                "trainingSource": "auto-composited fixture placement labels",
                "modelPath": "/models/nail-placement.onnx",
                "inputName": "features",
                "outputName": "placement",
                "featureNames": FEATURE_NAMES,
                "outputNames": OUTPUT_NAMES,
                "trainingMetrics": metrics,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MODEL_PATH.relative_to(ROOT)}")
    print(f"Wrote {METADATA_PATH.relative_to(ROOT)}")
    print(f"Placement training metrics: {metrics}")


if __name__ == "__main__":
    main()
