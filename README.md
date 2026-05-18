# Always Like Nail Try-On Prototype

Web AR prototype for trying Always Like press-on nail designs on hand images and
live camera input.

## What It Does

- Runs hand landmark detection in the browser with MediaPipe Tasks Vision.
- Draws press-on nail overlays on a live camera canvas.
- Provides a fixture review mode for repeatable still-image checks.
- Pulls public Shopify press-on nail product images into local review assets.

## Development

```bash
npm install
npm run dev
```

Open fixture review mode:

```text
http://127.0.0.1:5173/?mode=fixtures
```

Refresh public Shopify product reference images:

```bash
npm run shopify:download-press-ons
npm run assets:strip-metadata
```

Score and extract local press-on nail capture photos:

```bash
npm run nails:score -- --input public/extract-press-on-nails
npm run nails:extract -- --input public/extract-press-on-nails
npm run nails:prepare-roi-source -- --input public/extract-press-on-nails/example_1/IMG_1943.HEIC --output public/roi-sources/example_1.png
npm run nails:extract-roi -- --roi private/extraction-work/example_1/rois.json
npm run nails:approve -- --proposal private/extraction-work/example_1/proposal.json
```

Manual ROI extraction from the web app:

```text
http://127.0.0.1:5173/
```

Click **Extract nails**, upload a PNG/JPEG/WebP package image, draw one box for
each nail, and save the ROI JSON. Put that JSON somewhere under
`private/extraction-work/<product>/rois.json`, then run:

```bash
npm run nails:extract-roi -- --roi private/extraction-work/example_1/rois.json --source-image public/extract-press-on-nails/example_1/IMG_1943.HEIC
npm run nails:approve -- --proposal private/extraction-work/example_1/proposal.json
```

Many browsers do not display HEIC directly. For HEIC captures, either upload a
converted PNG/JPEG copy in the annotator or prepare a browser-friendly source:

```bash
npm run nails:prepare-roi-source -- --input public/extract-press-on-nails/example_1/IMG_1943.HEIC --output public/roi-sources/example_1.png
```

Then open:

```text
http://127.0.0.1:5173/?mode=annotate-nails&product=example_1&source=/roi-sources/example_1.png
```

Raw iPhone capture photos are intentionally ignored by git. Commit only reviewed
assets from `public/nail-assets/`.

## Verification

```bash
npm run format
npm run lint
npm run test
npm run build
npm run nails:test
npm run e2e
```

Product review screenshots are generated under `test-results/`, which is
intentionally ignored by git.
