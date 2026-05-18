# Blush Sparkle Cutout Improvement Prompt

Use case: product-mockup
Asset type: transparent press-on nail cutout for web AR overlay
Primary request: Restore and upscale this exact extracted press-on nail cutout to 3x visual resolution while preserving the exact Blush Sparkle design, proportions, decoration placement, orientation, aspect ratio, and nail silhouette.
Input image: one extracted nail PNG from `extracted_roi_from_source`
Output intent: save the improved transparent PNG into `extracted_roi_from_source_improved`

Constraints:
- Preserve the original nail identity and finger-specific shape.
- Keep the output dimensions at 3x the source cutout dimensions, with the same aspect ratio.
- Use a flat removable chroma-key background if true transparent output is not available, then remove the key locally.
- Keep the nail centered with generous transparent padding.
- Improve edge smoothness, resolution, texture clarity, gloss, sparkle detail, and pearl/rhinestone clarity.
- Do not invent new decorations, colors, text, packaging, fingers, or hands.
- Do not move decorations substantially, redesign the nail, or change the nail orientation; the existing metadata anchors should remain valid.
