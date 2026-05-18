from __future__ import annotations

import pytest
from PIL import Image, ImageDraw

from nail_extractor.roi import extract_roi_assets, validate_roi_document


def make_roi_document(source: str = "capture.png") -> dict:
    return {
        "productHandle": "demo-set",
        "sourceImage": source,
        "coordinateSpace": {"width": 500, "height": 300},
        "rois": [
            {"finger": "thumb", "bbox": [40, 80, 50, 130]},
            {"finger": "index", "bbox": [120, 60, 50, 160]},
            {"finger": "middle", "bbox": [200, 50, 50, 170]},
            {"finger": "ring", "bbox": [280, 65, 50, 150]},
            {"finger": "pinky", "bbox": [360, 90, 50, 120]},
        ],
    }


def test_validate_roi_document_requires_unique_complete_fingers() -> None:
    rois = validate_roi_document(make_roi_document())

    assert [roi.finger for roi in rois] == [
        "thumb",
        "index",
        "middle",
        "ring",
        "pinky",
    ]

    invalid = make_roi_document()
    invalid["rois"][1]["finger"] = "thumb"
    with pytest.raises(ValueError, match="Duplicate finger label"):
        validate_roi_document(invalid)

    invalid = make_roi_document()
    invalid["rois"] = invalid["rois"][:4]
    with pytest.raises(ValueError, match="missing fingers"):
        validate_roi_document(invalid)


def test_validate_roi_document_rejects_out_of_bounds_boxes() -> None:
    invalid = make_roi_document()
    invalid["rois"][0]["bbox"] = [480, 40, 80, 100]

    with pytest.raises(ValueError, match="outside coordinateSpace"):
        validate_roi_document(invalid)


def test_extract_roi_assets_exports_one_png_per_finger(tmp_path) -> None:
    source = tmp_path / "capture.png"
    image = Image.new("RGB", (500, 300), "#ead9ca")
    draw = ImageDraw.Draw(image)
    for roi in make_roi_document()["rois"]:
        x, y, width, height = roi["bbox"]
        draw.rounded_rectangle(
            (x + 6, y + 8, x + width - 6, y + height - 8),
            radius=16,
            fill="#dd7f9a",
        )
    image.save(source)

    document = make_roi_document(str(source))
    assets, failures = extract_roi_assets(document, tmp_path / "out")

    assert failures == []
    assert [asset["finger"] for asset in assets] == [
        "thumb",
        "index",
        "middle",
        "ring",
        "pinky",
    ]
    assert sorted(path.name for path in (tmp_path / "out").glob("*.png")) == [
        "index.png",
        "middle.png",
        "pinky.png",
        "ring.png",
        "thumb.png",
    ]
