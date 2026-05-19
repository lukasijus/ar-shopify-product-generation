# Blush Sparkle Canonical Cutout Prompt

Use case: background-extraction
Asset type: canonical transparent press-on nail cutout for web AR overlay
Primary request: Restore this exact extracted Blush Sparkle press-on nail as a clean high-resolution product asset.

Input image: one finger-specific extracted nail PNG from `extracted_roi_from_source`
Output path: `canonical/<finger>.png`

Constraints:
- Keep the same alpha-subject aspect ratio, silhouette, orientation, decoration placement, colors, pearls, gold beads, glitter, and glossy nude base.
- The visible nail alpha bounding box must stay within 8% of the source alpha bounding-box width/height ratio. Do not make the nail thinner, longer, wider, or shorter than the source silhouette.
- The output canvas may be 3x or higher resolution, but the visible nail shape must scale uniformly on X and Y.
- Improve resolution, edge cleanliness, surface texture, sparkle clarity, pearl/rhinestone clarity, and product polish.
- Keep the nail centered with generous transparent padding.
- Use a transparent background, or a perfectly flat removable chroma-key background if transparency is unavailable.
- Do not add a hand, packaging, shadow, floor, text, watermark, or new decoration.
- Do not change the finger-specific nail identity or make the design more generic.

Acceptance check:
- Compare the source alpha bounding-box ratio to the output alpha bounding-box ratio.
- Accept only if the output ratio is between 0.92x and 1.08x of the source ratio.
- Reject and regenerate if the nail looks squeezed on X/Y even if the design details are attractive.
