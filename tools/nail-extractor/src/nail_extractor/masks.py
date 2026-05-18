from __future__ import annotations

from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageStat

from .image_io import fit_within, save_png_without_metadata

FINGER_ORDER = ["thumb", "index", "middle", "ring", "pinky"]


@dataclass(frozen=True)
class MaskCandidate:
    bbox: tuple[int, int, int, int]
    area: int
    confidence: float
    finger: str | None = None

    def to_json(self) -> dict[str, float | int | str | list[int] | None]:
        data = asdict(self)
        data["bbox"] = list(self.bbox)
        return data


def _corner_background(image: Image.Image) -> tuple[float, float, float]:
    width, height = image.size
    patch = max(8, min(width, height) // 18)
    boxes = [
        (0, 0, patch, patch),
        (width - patch, 0, width, patch),
        (0, height - patch, patch, height),
        (width - patch, height - patch, width, height),
    ]
    channels = [[], [], []]
    for box in boxes:
        stat = ImageStat.Stat(image.crop(box))
        for channel, mean in enumerate(stat.mean):
            channels[channel].append(mean)

    return tuple(sum(values) / len(values) for values in channels)


def _foreground_mask(image: Image.Image) -> Image.Image:
    small = image.convert("RGB")
    background = _corner_background(small)
    mask = Image.new("L", small.size, 0)
    output = mask.load()

    for y in range(small.height):
        for x in range(small.width):
            red, green, blue = small.getpixel((x, y))
            distance = (
                (red - background[0]) ** 2
                + (green - background[1]) ** 2
                + (blue - background[2]) ** 2
            ) ** 0.5
            brightness = (red + green + blue) / 3
            glare = red > 245 and green > 245 and blue > 245
            if distance > 34 and 24 < brightness < 248 and not glare:
                output[x, y] = 255

    return mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(5))


def _packaging_roi(image: Image.Image) -> tuple[int, int, int, int]:
    light_mask = Image.new("L", image.size, 0)
    output = light_mask.load()

    for y in range(image.height):
        for x in range(image.width):
            red, green, blue = image.getpixel((x, y))
            brightness = (red + green + blue) / 3
            saturation = max(red, green, blue) - min(red, green, blue)
            if brightness > 118 and saturation < 82:
                output[x, y] = 255

    light_mask = light_mask.filter(ImageFilter.MaxFilter(9)).filter(
        ImageFilter.MinFilter(5)
    )
    components = _components(light_mask)
    image_area = image.width * image.height
    viable = []

    for bbox, area in components:
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        if area / image_area < 0.08 or width < image.width * 0.22:
            continue
        lower_bias = (y1 + y2) / 2 / image.height
        viable.append((area * (0.72 + lower_bias * 0.28), bbox))

    if not viable:
        return (0, 0, image.width, image.height)

    _, bbox = max(viable, key=lambda item: item[0])
    x1, y1, x2, y2 = bbox
    margin_x = round((x2 - x1) * 0.04)
    margin_y = round((y2 - y1) * 0.04)
    return (
        max(0, x1 - margin_x),
        max(0, y1 - margin_y),
        min(image.width, x2 + margin_x),
        min(image.height, y2 + margin_y),
    )


def _components(mask: Image.Image) -> list[tuple[tuple[int, int, int, int], int]]:
    width, height = mask.size
    data = mask.load()
    seen = bytearray(width * height)
    components = []

    for start_y in range(height):
        for start_x in range(width):
            index = start_y * width + start_x
            if seen[index] or data[start_x, start_y] == 0:
                continue

            queue = deque([(start_x, start_y)])
            seen[index] = 1
            min_x = max_x = start_x
            min_y = max_y = start_y
            area = 0

            while queue:
                x, y = queue.popleft()
                area += 1
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

                for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if nx < 0 or ny < 0 or nx >= width or ny >= height:
                        continue
                    next_index = ny * width + nx
                    if seen[next_index] or data[nx, ny] == 0:
                        continue
                    seen[next_index] = 1
                    queue.append((nx, ny))

            components.append(((min_x, min_y, max_x + 1, max_y + 1), area))

    return components


def _candidate_from_component(
    bbox: tuple[int, int, int, int], area: int, image_size: tuple[int, int]
) -> MaskCandidate | None:
    x1, y1, x2, y2 = bbox
    width = x2 - x1
    height = y2 - y1
    image_area = image_size[0] * image_size[1]
    if image_area <= 0 or width <= 0 or height <= 0:
        return None

    area_ratio = area / image_area
    bbox_area = width * height
    fill_ratio = area / bbox_area
    aspect = max(width, height) / max(1, min(width, height))

    if area_ratio < 0.0008 or area_ratio > 0.12:
        return None
    if fill_ratio < 0.18 or fill_ratio > 0.98:
        return None
    if aspect < 1.05 or aspect > 8.5:
        return None

    confidence = min(1.0, fill_ratio * 0.35 + min(aspect / 3.2, 1) * 0.35 + 0.3)
    return MaskCandidate(bbox=bbox, area=area, confidence=round(confidence, 4))


def detect_nail_candidates(
    image: Image.Image, expected_count: int = 5
) -> tuple[Image.Image, list[MaskCandidate]]:
    small = fit_within(image, 900).convert("RGB")
    roi = _packaging_roi(small)
    roi_image = small.crop(roi)
    roi_mask = _foreground_mask(roi_image)
    mask = Image.new("L", small.size, 0)
    mask.paste(roi_mask, roi[:2])
    candidates = [
        candidate
        for bbox, area in _components(roi_mask)
        if (candidate := _candidate_from_component(bbox, area, roi_mask.size))
        is not None
    ]
    candidates.sort(key=lambda candidate: candidate.confidence, reverse=True)
    selected = sorted(
        candidates[:expected_count], key=lambda candidate: candidate.bbox[0]
    )

    named = [
        MaskCandidate(
            bbox=(
                candidate.bbox[0] + roi[0],
                candidate.bbox[1] + roi[1],
                candidate.bbox[2] + roi[0],
                candidate.bbox[3] + roi[1],
            ),
            area=candidate.area,
            confidence=candidate.confidence,
            finger=FINGER_ORDER[index] if index < len(FINGER_ORDER) else None,
        )
        for index, candidate in enumerate(selected)
    ]

    return mask, named


def export_candidate_pngs(
    image: Image.Image,
    mask: Image.Image,
    candidates: list[MaskCandidate],
    output_dir: Path,
) -> list[Path]:
    output_dir.mkdir(parents=True, exist_ok=True)
    scaled = fit_within(image, 900).convert("RGBA")
    exported = []

    for index, candidate in enumerate(candidates):
        x1, y1, x2, y2 = candidate.bbox
        crop = scaled.crop(candidate.bbox)
        alpha = mask.crop(candidate.bbox)
        rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
        rgba.paste(crop, (0, 0), alpha)
        finger = candidate.finger or f"candidate-{index + 1}"
        path = output_dir / f"{finger}.png"
        save_png_without_metadata(rgba, path)
        exported.append(path)

    return exported


def make_review_sheet(
    image: Image.Image,
    mask: Image.Image,
    candidates: list[MaskCandidate],
    output_path: Path,
) -> None:
    preview = fit_within(image, 900).convert("RGB")
    overlay = preview.copy()
    draw = ImageDraw.Draw(overlay)

    for candidate in candidates:
        label = candidate.finger or "candidate"
        draw.rectangle(candidate.bbox, outline=(255, 72, 126), width=4)
        draw.text(
            (candidate.bbox[0], max(0, candidate.bbox[1] - 18)),
            label,
            fill=(255, 72, 126),
        )

    mask_rgb = ImageChops.multiply(
        Image.merge("RGB", (mask, mask, mask)),
        Image.new("RGB", mask.size, (255, 210, 225)),
    )
    sheet = Image.new("RGB", (preview.width * 2, preview.height), "white")
    sheet.paste(overlay, (0, 0))
    sheet.paste(mask_rgb.resize(preview.size), (preview.width, 0))
    save_png_without_metadata(sheet, output_path)
