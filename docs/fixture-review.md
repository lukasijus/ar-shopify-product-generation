# Fixture Review Notes

The fixture loop uses public project fixtures under `public/test-fixtures/hands/`:

- `generated/`: bare-hand inputs used by the overlay algorithm
- `targets/`: synthetic press-on-nail references used for visual calibration
- `no-visible-nails/`: negative fixtures where nails are hidden and overlays
  should be suppressed

## Current Calibration Status

The current overlay geometry is tuned for the baseline and moderate fixtures:

- `back-hand-flat-good-light`
- `back-hand-fingers-close`
- `back-hand-angled-left`
- `back-hand-angled-right`

For those fixtures, the overlay nails are intentionally smaller than the first
prototype, centered closer to the visible nail beds, and rotated with each
finger. The target references are synthetic and not exact pose pairs, so visual
comparison should focus on scale, placement, and direction rather than exact
pixel alignment.

## Shopify Product Matrix

The press-on nail product catalog is stored in `src/app/pressOnProducts.json`.
It was pulled from the Shopify `Press on nails` smart collection and includes
the product title, handle, price, product URL, Shopify CDN image URL, local
reference image path, and a first-pass visual style for the canvas overlay.

Run this whenever the source product images need refreshing:

```bash
npm run shopify:download-press-ons
```

That command downloads the Shopify product images into
`public/shopify/press-ons/source/`. The fixture UI accepts a `product` query
parameter, for example:

```text
/?mode=fixtures&fixture=back-hand-flat-good-light&product=chrome-starburst
```

The product matrix Playwright test captures every Shopify press-on set across
the core visible-hand fixtures into `test-results/product-overlays/`. These
images are review artifacts for realism and alignment, not automated pixel
truth yet.

## Nail Asset Extraction

Raw press-on nail capture photos should stay local and ignored. The extractor
can read HEIC/PNG/JPEG/WebP captures from a folder like
`public/extract-press-on-nails/` or `private/raw/press-on-captures/`, score the
candidate photos, generate mask proposals, and write review artifacts to
`private/extraction-work/`.

```bash
npm run nails:score -- --input public/extract-press-on-nails
npm run nails:extract -- --input public/extract-press-on-nails
```

After reviewing a proposal sheet, approve it into public AR assets:

```bash
npm run nails:approve -- --proposal private/extraction-work/example_1/proposal.json
```

Approved assets are written to `public/nail-assets/<product-handle>/` as
per-finger transparent PNG files plus `metadata.json`. If candidate count or
mask quality is poor, recapture the product instead of approving weak assets.

## Known Limitations

- MediaPipe hand landmarks do not locate the actual nail bed; placement is still
  a geometric approximation from fingertip and finger-joint landmarks.
- The no-visible-nails fixtures currently encode expected fixture behavior. A
  real live-camera occlusion/nail-bed visibility classifier is still future
  work.
- The hard fixtures are useful for regression review but are not the success
  target for this calibration pass.
- Low-light and busy-background fixtures can make the overlay look flatter or
  brighter than the target reference because the renderer does not yet adapt to
  scene lighting.
- Occlusion is not modeled. If fingers overlap or curl, overlays can still float
  above the image.
- Live camera jitter is not solved by the still-image fixture loop; smoothing
  should be handled in a later pass.

## Review Artifacts

Run Playwright to regenerate the side-by-side review screenshots:

```bash
npm run e2e
```

The review images are written to:

```text
test-results/fixture-overlays/
test-results/product-overlays/
```
