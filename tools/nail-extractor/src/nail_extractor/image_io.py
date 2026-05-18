from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageOps
from pillow_heif import register_heif_opener

register_heif_opener()

SUPPORTED_INPUTS = {".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp"}


def find_images(path: Path) -> list[Path]:
    if path.is_file() and path.suffix.lower() in SUPPORTED_INPUTS:
        return [path]

    if not path.exists():
        raise FileNotFoundError(f"Input path does not exist: {path}")

    return sorted(
        candidate
        for candidate in path.rglob("*")
        if candidate.is_file() and candidate.suffix.lower() in SUPPORTED_INPUTS
    )


def load_rgb(path: Path) -> Image.Image:
    with Image.open(path) as image:
        normalized = ImageOps.exif_transpose(image)
        return normalized.convert("RGB")


def save_png_without_metadata(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG", optimize=True)


def fit_within(image: Image.Image, max_side: int) -> Image.Image:
    width, height = image.size
    largest = max(width, height)
    if largest <= max_side:
        return image.copy()

    scale = max_side / largest
    return image.resize(
        (max(1, round(width * scale)), max(1, round(height * scale))),
        Image.Resampling.LANCZOS,
    )
