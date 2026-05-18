from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageFilter, ImageStat


@dataclass(frozen=True)
class ImageScore:
    path: str
    width: int
    height: int
    sharpness: float
    exposure: float
    glare: float
    composition: float
    total: float

    def to_json(self) -> dict[str, float | int | str]:
        return asdict(self)


def _variance(values: list[float]) -> float:
    if not values:
        return 0.0

    mean = sum(values) / len(values)
    return sum((value - mean) ** 2 for value in values) / len(values)


def _sharpness_score(image: Image.Image) -> float:
    grayscale = image.convert("L").resize((320, 320), Image.Resampling.BILINEAR)
    edges = grayscale.filter(
        ImageFilter.Kernel(
            (3, 3),
            (-1, -1, -1, -1, 8, -1, -1, -1, -1),
            scale=1,
            offset=0,
        )
    )
    variance = _variance(list(edges.get_flattened_data()))
    return min(1.0, variance / 2200)


def _exposure_score(image: Image.Image) -> float:
    grayscale = image.convert("L").resize((256, 256), Image.Resampling.BILINEAR)
    mean = ImageStat.Stat(grayscale).mean[0] / 255
    return max(0.0, 1 - abs(mean - 0.52) / 0.52)


def _glare_ratio(image: Image.Image) -> float:
    small = image.resize((256, 256), Image.Resampling.BILINEAR)
    pixels = small.convert("RGB").get_flattened_data()
    glare_pixels = sum(
        1 for red, green, blue in pixels if red > 242 and green > 242 and blue > 242
    )
    return glare_pixels / (256 * 256)


def _composition_score(image: Image.Image) -> float:
    width, height = image.size
    if width <= 0 or height <= 0:
        return 0.0

    ratio = min(width, height) / max(width, height)
    megapixels = (width * height) / 1_000_000
    ratio_score = min(1.0, ratio / 0.55)
    size_score = min(1.0, megapixels / 1.4)
    return ratio_score * 0.55 + size_score * 0.45


def score_image(path: Path, image: Image.Image) -> ImageScore:
    sharpness = _sharpness_score(image)
    exposure = _exposure_score(image)
    glare = _glare_ratio(image)
    composition = _composition_score(image)
    total = (
        sharpness * 0.38
        + exposure * 0.24
        + max(0.0, 1 - glare * 8) * 0.22
        + composition * 0.16
    )

    return ImageScore(
        path=str(path),
        width=image.width,
        height=image.height,
        sharpness=round(sharpness, 4),
        exposure=round(exposure, 4),
        glare=round(glare, 4),
        composition=round(composition, 4),
        total=round(total, 4),
    )
