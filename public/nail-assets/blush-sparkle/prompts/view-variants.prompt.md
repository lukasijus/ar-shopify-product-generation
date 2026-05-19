# Blush Sparkle View Variants Prompt

Use case: precise-object-edit
Asset type: transparent press-on nail view variants for web AR overlay
Primary request: Generate six useful visible AR views from the canonical Blush Sparkle nail cutout.

Input image: one canonical finger-specific nail PNG from `canonical/<finger>.png`
Output paths:
- `views/<finger>/front.png`
- `views/<finger>/slight-left.png`
- `views/<finger>/slight-right.png`
- `views/<finger>/angled-left.png`
- `views/<finger>/angled-right.png`
- `views/<finger>/side.png`

Constraints:
- Preserve the exact Blush Sparkle product identity, finger-specific silhouette family, decoration placement, gloss, pearls, gold beads, glitter, and nude/rose-gold colors.
- Generate only visible overlay views: front, slight-left, slight-right, angled-left, angled-right, and side.
- Do not generate underside/back/reverse views. Palm-side hands should be rejected by the visibility model instead of rendered.
- Keep each variant centered with transparent padding and compatible top/bottom anchors.
- Preserve the canonical nail height for every view. Perspective should mainly reduce visible width and add lateral curvature; it must not stretch the nail taller.
- Front view must keep the same alpha bounding-box width/height ratio as canonical within 8%.
- Slight-left and slight-right should keep 88-96% of the canonical visible width.
- Angled-left and angled-right should keep 76-86% of the canonical visible width.
- Side should keep 45-60% of the canonical visible width.
- Use a transparent background, or a perfectly flat removable chroma-key background if transparency is unavailable.
- Do not add hands, packaging, shadows, text, watermarks, or invented decorations.

Acceptance check:
- Reject outputs where any variant is vertically stretched, horizontally squeezed beyond its requested view range, clipped by the canvas, or redesigned.
- Reject outputs where decorations move enough that the nail no longer reads as the same finger-specific Blush Sparkle asset.
