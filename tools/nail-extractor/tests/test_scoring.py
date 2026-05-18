from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter

from nail_extractor.scoring import score_image


def test_score_prefers_sharp_image_over_blurry_image(tmp_path: Path) -> None:
    sharp = Image.new("RGB", (600, 600), "#f3e8df")
    for x in range(80, 520, 40):
        for y in range(80, 520, 40):
            sharp.putpixel((x, y), (80, 30, 60))

    blurry = sharp.filter(ImageFilter.GaussianBlur(8))

    sharp_score = score_image(tmp_path / "sharp.png", sharp)
    blurry_score = score_image(tmp_path / "blurry.png", blurry)

    assert sharp_score.sharpness > blurry_score.sharpness
    assert sharp_score.total > blurry_score.total


def test_score_penalizes_large_glare_regions(tmp_path: Path) -> None:
    clean = Image.new("RGB", (600, 600), "#d9c7b8")
    glare = clean.copy()
    for x in range(100, 500):
        for y in range(100, 500):
            glare.putpixel((x, y), (255, 255, 255))

    clean_score = score_image(tmp_path / "clean.png", clean)
    glare_score = score_image(tmp_path / "glare.png", glare)

    assert glare_score.glare > clean_score.glare
    assert clean_score.total > glare_score.total
