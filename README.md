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

## Verification

```bash
npm run format
npm run lint
npm run test
npm run build
npm run e2e
```

Product review screenshots are generated under `test-results/`, which is
intentionally ignored by git.
