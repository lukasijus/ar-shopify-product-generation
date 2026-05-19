#!/usr/bin/env python3
from __future__ import annotations

import json
from pathlib import Path

import onnx

ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = ROOT / "public" / "models" / "nail-visibility.onnx"
METADATA_PATH = ROOT / "public" / "models" / "nail-visibility.metadata.json"


def main() -> None:
    if not MODEL_PATH.exists():
        raise SystemExit(f"Missing model: {MODEL_PATH.relative_to(ROOT)}")
    if not METADATA_PATH.exists():
        raise SystemExit(f"Missing metadata: {METADATA_PATH.relative_to(ROOT)}")

    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    feature_names = metadata.get("featureNames", [])
    if len(feature_names) < 9:
        raise SystemExit(f"Expected at least 9 features, got {len(feature_names)}")
    if metadata.get("inputName") != "features":
        raise SystemExit("Expected inputName to be 'features'")
    if metadata.get("outputName") != "probability":
        raise SystemExit("Expected outputName to be 'probability'")
    metrics = metadata.get("trainingMetrics", {})
    if metadata.get("modelVersion") == "fixture-trained-v1":
        if metrics.get("rowCount", 0) <= 0:
            raise SystemExit("Fixture-trained model has no training rows")
        if metrics.get("accuracy", 0) < 0.72:
            raise SystemExit(
                f"Fixture-trained model accuracy is too low: {metrics.get('accuracy')}"
            )

    model = onnx.load(MODEL_PATH)
    onnx.checker.check_model(model)

    print("Nail visibility model artifact is valid.")


if __name__ == "__main__":
    main()
