from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw

from nail_extractor.masks import detect_nail_candidates, export_candidate_pngs
from nail_extractor.metadata import risky_png_chunks


def make_synthetic_nail_sheet() -> Image.Image:
    image = Image.new("RGB", (900, 600), "#ead9ca")
    draw = ImageDraw.Draw(image)
    x_positions = [120, 260, 410, 560, 700]
    heights = [180, 230, 250, 220, 170]

    for index, x in enumerate(x_positions):
        y = 170 + (250 - heights[index]) // 2
        draw.rounded_rectangle(
            (x, y, x + 70, y + heights[index]),
            radius=34,
            fill=(230, 112 + index * 8, 150),
        )

    return image


def test_detects_five_synthetic_nail_candidates_in_finger_order() -> None:
    image = make_synthetic_nail_sheet()

    _, candidates = detect_nail_candidates(image)

    assert [candidate.finger for candidate in candidates] == [
        "thumb",
        "index",
        "middle",
        "ring",
        "pinky",
    ]
    assert len(candidates) == 5
    assert all(candidate.confidence > 0.4 for candidate in candidates)


def test_exports_transparent_candidate_pngs_without_risky_metadata(
    tmp_path: Path,
) -> None:
    image = make_synthetic_nail_sheet()
    mask, candidates = detect_nail_candidates(image)

    paths = export_candidate_pngs(image, mask, candidates, tmp_path)

    assert [path.name for path in paths] == [
        "thumb.png",
        "index.png",
        "middle.png",
        "ring.png",
        "pinky.png",
    ]
    for path in paths:
        assert risky_png_chunks(path) == []
        with Image.open(path) as output:
            assert output.mode == "RGBA"
            assert output.getchannel("A").getbbox() is not None
