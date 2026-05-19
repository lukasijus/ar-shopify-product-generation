#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

FINGERS = ("thumb", "index", "middle", "ring", "pinky")
VIEW_WIDTH_RANGES = {
    "front": (0.92, 1.08),
    "slight-left": (0.88, 0.96),
    "slight-right": (0.88, 0.96),
    "angled-left": (0.76, 0.86),
    "angled-right": (0.76, 0.86),
    "side": (0.45, 0.60),
}


def alpha_bbox(path: Path) -> tuple[int, int, int, int]:
    image = Image.open(path).convert("RGBA")
    bbox = image.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError(f"{path} has no non-transparent pixels")

    return bbox


def alpha_size(path: Path) -> tuple[int, int]:
    left, top, right, bottom = alpha_bbox(path)

    return right - left, bottom - top


def ratio(path: Path) -> float:
    width, height = alpha_size(path)

    return width / height


def validate_product(root: Path) -> list[str]:
    errors: list[str] = []
    source_dir = root / "extracted_roi_from_source"
    canonical_dir = root / "canonical"
    views_dir = root / "views"

    for finger in FINGERS:
        source = source_dir / f"{finger}.png"
        canonical = canonical_dir / f"{finger}.png"
        source_ratio = ratio(source)
        canonical_ratio = ratio(canonical)
        ratio_delta = canonical_ratio / source_ratio
        if not 0.92 <= ratio_delta <= 1.08:
            errors.append(
                f"{finger} canonical ratio {canonical_ratio:.3f} is not within "
                f"8% of source ratio {source_ratio:.3f}"
            )

        canonical_width, canonical_height = alpha_size(canonical)
        for view, (min_width, max_width) in VIEW_WIDTH_RANGES.items():
            view_path = views_dir / finger / f"{view}.png"
            view_width, view_height = alpha_size(view_path)
            width_delta = view_width / canonical_width
            height_delta = view_height / canonical_height
            if not min_width <= width_delta <= max_width:
                errors.append(
                    f"{finger}/{view} width ratio {width_delta:.3f} is outside "
                    f"{min_width:.2f}-{max_width:.2f}"
                )
            if not 0.98 <= height_delta <= 1.02:
                errors.append(
                    f"{finger}/{view} height ratio {height_delta:.3f} should stay near 1.00"
                )

    return errors


def main() -> int:
    root = Path(
        sys.argv[1] if len(sys.argv) > 1 else "public/nail-assets/blush-sparkle"
    )
    errors = validate_product(root)
    if errors:
        print("Nail asset ratio validation failed:")
        for error in errors:
            print(f"- {error}")
        return 1

    print(f"Nail asset ratios valid: {root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
