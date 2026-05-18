# Blush Sparkle Target Fixture Prompt

Use case: identity-preserve
Asset type: product-specific target reference for web AR overlay evaluation
Primary request: Add the Blush Sparkle press-on nails from the improved cutout assets onto the visible fingernails in the bare hand fixture.
Input images:
- Bare hand fixture from `public/test-fixtures/hands/general`
- Improved Blush Sparkle nail cutouts from `public/nail-assets/blush-sparkle/extracted_roi_from_source_improved`
Output intent: save the target image as `public/test-fixtures/hands/targets/blush-sparkle/<fixture-id-without-v2-prefix>.png`

Constraints:
- Preserve the hand pose, camera framing, background, lighting, skin texture, and visible fingers from the bare fixture.
- Add nails only to the fixture's expected visible fingers.
- Do not add nails to hidden, cropped, occluded, or non-visible nail beds.
- Match perspective, rotation, scale, shadows, and gloss so the nails look physically attached.
- Preserve the Blush Sparkle product design; do not simplify the sparkle, pearl, or blush gradient details.
- Do not add text, watermark, jewelry, extra fingers, packaging, or other objects.
