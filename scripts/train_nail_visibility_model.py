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

FEATURE_NAMES = [
    "bias",
    "distalLengthNormalized",
    "supportLengthNormalized",
    "extensionDot",
    "wristToTipRatio",
    "edgeSafetyNormalized",
    "horizontalBias",
    "directionYNormalized",
    "zDelta",
]


def main() -> None:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Initial distillation of the hand-authored visibility heuristic.
    # These weights are intentionally simple: the goal is to validate the
    # browser model path before replacing them with fixture-derived training.
    weights = np.array(
        [
            -2.35,
            36.0,
            26.0,
            2.3,
            18.0,
            18.0,
            -0.08,
            0.0,
            0.0,
        ],
        dtype=np.float32,
    ).reshape((len(FEATURE_NAMES), 1))
    bias = np.array([-17.28], dtype=np.float32)

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
                "modelVersion": "heuristic-distilled-v1",
                "trainingSource": "hand-authored heuristic weights",
                "modelPath": "/models/nail-visibility.onnx",
                "inputName": "features",
                "outputName": "probability",
                "featureNames": FEATURE_NAMES,
                "threshold": 0.5,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {MODEL_PATH.relative_to(ROOT)}")
    print(f"Wrote {METADATA_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
