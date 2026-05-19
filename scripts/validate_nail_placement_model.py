#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import onnx

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "public" / "models" / "nail-placement.onnx"
METADATA_PATH = ROOT / "public" / "models" / "nail-placement.metadata.json"
TRAINING_PATH = ROOT / "public" / "models" / "nail-placement.training.json"


def main() -> None:
    if not MODEL_PATH.exists():
        raise SystemExit(f"Missing model: {MODEL_PATH.relative_to(ROOT)}")
    if not METADATA_PATH.exists():
        raise SystemExit(f"Missing metadata: {METADATA_PATH.relative_to(ROOT)}")
    if not TRAINING_PATH.exists():
        raise SystemExit(f"Missing training data: {TRAINING_PATH.relative_to(ROOT)}")

    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    training = json.loads(TRAINING_PATH.read_text(encoding="utf-8"))
    feature_count = len(metadata.get("featureNames", []))
    output_count = len(metadata.get("outputNames", []))

    if feature_count < 20:
        raise SystemExit(f"Expected placement feature vector, got {feature_count}")
    if output_count != 11:
        raise SystemExit(f"Expected 11 placement outputs, got {output_count}")
    if training.get("positiveCount", 0) <= 0:
        raise SystemExit("Expected positive placement rows")
    metrics = metadata.get("trainingMetrics", {})
    if metrics.get("sourceRowCount", 0) <= 0:
        raise SystemExit("Placement model was not trained from source rows")
    if metrics.get("correctionMeanAbsoluteError", 1) > 0.035:
        raise SystemExit(
            "Placement correction MAE is too high: "
            f"{metrics.get('correctionMeanAbsoluteError')}"
        )

    model = onnx.load(MODEL_PATH)
    onnx.checker.check_model(model)
    print("Nail placement model artifact is valid.")


if __name__ == "__main__":
    main()
