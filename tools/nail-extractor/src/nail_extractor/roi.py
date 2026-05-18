from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFilter

from .image_io import load_rgb, save_png_without_metadata
from .masks import FINGER_ORDER, MaskCandidate, _components, _foreground_mask
from .metadata import risky_png_chunks


@dataclass(frozen=True)
class NailRoi:
    finger: str
    bbox: tuple[int, int, int, int]

    @property
    def xyxy(self) -> tuple[int, int, int, int]:
        x, y, width, height = self.bbox
        return (x, y, x + width, y + height)


def validate_roi_document(document: dict) -> list[NailRoi]:
    coordinate_space = document.get("coordinateSpace")
    rois = document.get("rois")

    if not isinstance(coordinate_space, dict):
        raise ValueError("ROI document must include coordinateSpace.")
    if not isinstance(rois, list):
        raise ValueError("ROI document must include rois array.")

    image_width = int(coordinate_space.get("width", 0))
    image_height = int(coordinate_space.get("height", 0))
    if image_width <= 0 or image_height <= 0:
        raise ValueError("coordinateSpace width and height must be positive.")

    parsed: list[NailRoi] = []
    seen = set()
    for roi in rois:
        finger = roi.get("finger")
        bbox = roi.get("bbox")
        if finger not in FINGER_ORDER:
            raise ValueError(f"Unsupported finger label: {finger}")
        if finger in seen:
            raise ValueError(f"Duplicate finger label: {finger}")
        if not isinstance(bbox, list) or len(bbox) != 4:
            raise ValueError(f"{finger} bbox must be [x, y, width, height].")

        x, y, width, height = [int(round(value)) for value in bbox]
        if width <= 0 or height <= 0:
            raise ValueError(f"{finger} bbox width and height must be positive.")
        if x < 0 or y < 0 or x + width > image_width or y + height > image_height:
            raise ValueError(f"{finger} bbox is outside coordinateSpace.")

        seen.add(finger)
        parsed.append(NailRoi(finger=finger, bbox=(x, y, width, height)))

    missing = [finger for finger in FINGER_ORDER if finger not in seen]
    if missing:
        raise ValueError(f"ROI document is missing fingers: {', '.join(missing)}")

    return sorted(parsed, key=lambda roi: FINGER_ORDER.index(roi.finger))


def _clean_roi_mask(crop: Image.Image) -> tuple[Image.Image, bool]:
    mask = _foreground_mask(crop.convert("RGB"))
    components = _components(mask)
    if not components:
        return Image.new("L", crop.size, 0), False

    crop_area = crop.width * crop.height
    ranked = sorted(components, key=lambda item: item[1], reverse=True)
    bbox, area = ranked[0]
    if area / crop_area < 0.08:
        return Image.new("L", crop.size, 0), False

    clean = Image.new("L", crop.size, 0)
    source = mask.load()
    output = clean.load()
    x1, y1, x2, y2 = bbox
    for y in range(y1, y2):
        for x in range(x1, x2):
            if source[x, y] > 0:
                output[x, y] = 255

    clean = clean.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.8))
    return clean, True


def extract_roi_assets(
    roi_document: dict, output_dir: Path
) -> tuple[list[dict], list[str]]:
    source_path = Path(roi_document["sourceImage"])
    image = load_rgb(source_path).convert("RGBA")
    rois = validate_roi_document(roi_document)
    output_dir.mkdir(parents=True, exist_ok=True)
    assets = []
    failures = []

    for roi in rois:
        crop = image.crop(roi.xyxy)
        alpha, ok = _clean_roi_mask(crop)
        rgba = Image.new("RGBA", crop.size, (0, 0, 0, 0))
        rgba.paste(crop, (0, 0), alpha)
        target = output_dir / f"{roi.finger}.png"
        save_png_without_metadata(rgba, target)
        chunks = risky_png_chunks(target)
        if chunks:
            raise ValueError(f"{target} contains risky PNG chunks: {chunks}")
        if not ok:
            failures.append(roi.finger)

        assets.append(
            {
                "finger": roi.finger,
                "bbox": list(roi.bbox),
                "assetPath": str(target),
                "confidence": 1.0 if ok else 0.0,
            }
        )

    return assets, failures
