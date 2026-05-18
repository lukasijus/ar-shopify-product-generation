from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from nail_extractor.cli import main


def make_capture(path: Path) -> None:
    image = Image.new("RGB", (900, 600), "#ead9ca")
    draw = ImageDraw.Draw(image)
    for index, x in enumerate([120, 260, 410, 560, 700]):
        draw.rounded_rectangle(
            (x, 160, x + 70, 380 + index * 6),
            radius=34,
            fill=(220, 100 + index * 10, 145),
        )
    image.save(path)


def test_extract_and_approve_pipeline(
    tmp_path: Path,
    monkeypatch,
) -> None:
    capture_dir = tmp_path / "captures" / "demo-set"
    capture_dir.mkdir(parents=True)
    make_capture(capture_dir / "capture.png")

    work_dir = tmp_path / "work"
    public_dir = tmp_path / "public"

    monkeypatch.setattr(
        "sys.argv",
        [
            "nail-extractor",
            "extract",
            "--input",
            str(capture_dir),
            "--work-dir",
            str(work_dir),
        ],
    )
    assert main() == 0

    proposal = work_dir / "demo-set" / "proposal.json"
    assert proposal.exists()
    proposal_data = json.loads(proposal.read_text())
    assert proposal_data["candidateCount"] == 5
    assert proposal_data["status"] == "needs_review"

    monkeypatch.setattr(
        "sys.argv",
        [
            "nail-extractor",
            "approve",
            "--proposal",
            str(proposal),
            "--output",
            str(public_dir),
        ],
    )
    assert main() == 0

    asset_dir = public_dir / "demo-set"
    source_asset_dir = asset_dir / "extracted_roi_from_source"
    assert sorted(path.name for path in source_asset_dir.glob("*.png")) == [
        "index.png",
        "middle.png",
        "pinky.png",
        "ring.png",
        "thumb.png",
    ]
    metadata = json.loads((asset_dir / "metadata.json").read_text())
    assert metadata["productHandle"] == "demo-set"
    assert metadata["activeAssetSet"] == "extracted_roi_from_source"
    assert metadata["assets"][0]["path"].startswith(
        "/nail-assets/demo-set/extracted_roi_from_source/"
    )
    assert "private/" not in json.dumps(metadata)


def test_prepare_source_and_extract_roi_pipeline(tmp_path: Path, monkeypatch) -> None:
    capture = tmp_path / "capture.png"
    make_capture(capture)
    source = tmp_path / "roi-source.png"
    work_dir = tmp_path / "work"

    monkeypatch.setattr(
        "sys.argv",
        [
            "nail-extractor",
            "prepare-roi-source",
            "--input",
            str(capture),
            "--output",
            str(source),
        ],
    )
    assert main() == 0
    assert source.exists()

    roi_document = {
        "productHandle": "demo-set",
        "sourceImage": str(source),
        "coordinateSpace": {"width": 900, "height": 600},
        "rois": [
            {"finger": "thumb", "bbox": [112, 148, 86, 244]},
            {"finger": "index", "bbox": [252, 148, 86, 250]},
            {"finger": "middle", "bbox": [402, 148, 86, 256]},
            {"finger": "ring", "bbox": [552, 148, 86, 262]},
            {"finger": "pinky", "bbox": [692, 148, 86, 268]},
        ],
    }
    roi_path = tmp_path / "rois.json"
    roi_path.write_text(json.dumps(roi_document))

    monkeypatch.setattr(
        "sys.argv",
        [
            "nail-extractor",
            "extract-roi",
            "--roi",
            str(roi_path),
            "--work-dir",
            str(work_dir),
        ],
    )
    assert main() == 0

    proposal = json.loads((work_dir / "demo-set" / "proposal.json").read_text())
    assert proposal["status"] == "needs_review"
    assert proposal["candidateCount"] == 5
