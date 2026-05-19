#!/usr/bin/env node
/* global window */
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { chromium } from "@playwright/test";

const root = process.cwd();
const port = Number(process.env.NAIL_PLACEMENT_TRAINING_PORT ?? 5173);
const baseUrl = `http://127.0.0.1:${port}`;
const outputPath = join(root, "public/models/nail-placement.training.json");

const fixtureSource = readFileSync(
  join(root, "src/app/fixtureManifest.ts"),
  "utf8",
);
const fixtureIds = [...fixtureSource.matchAll(/id: "([^"]+)"/g)].map(
  (match) => match[1],
);

if (fixtureIds.length === 0) {
  throw new Error("No fixture ids found in src/app/fixtureManifest.ts");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isServerReady = async () => {
  try {
    const response = await fetch(baseUrl);
    return response.ok;
  } catch {
    return false;
  }
};

const startServer = async () => {
  if (await isServerReady()) {
    return null;
  }

  const server = spawn(
    "npm",
    ["run", "dev", "--", "--host", "127.0.0.1", "--port", String(port)],
    {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BROWSER: "none" },
    },
  );

  server.stdout.on("data", (chunk) => process.stdout.write(chunk));
  server.stderr.on("data", (chunk) => process.stderr.write(chunk));

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (await isServerReady()) {
      return server;
    }
    await sleep(500);
  }

  server.kill();
  throw new Error(`Vite server did not become ready at ${baseUrl}`);
};

const browserExecutable =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ?? "/snap/bin/chromium";

const server = await startServer();
const browser = await chromium.launch({ executablePath: browserExecutable });
const page = await browser.newPage();
const fixtureSamples = [];

try {
  for (const fixtureId of fixtureIds) {
    await page.goto(
      `${baseUrl}/?mode=fixtures&fixture=${fixtureId}&product=blush-sparkle`,
      { waitUntil: "domcontentloaded" },
    );
    await page.waitForFunction(
      (expectedFixtureId) =>
        window.__alwaysLikePlacementTrainingSample?.fixtureId ===
        expectedFixtureId,
      fixtureId,
      { timeout: 90_000 },
    );

    const sample = await page.evaluate(
      () => window.__alwaysLikePlacementTrainingSample,
    );
    fixtureSamples.push(sample);
    const rowCount = sample?.rows.length ?? 0;
    console.log(
      `${fixtureId}: ${sample?.detected ? "detected" : "no-hand"} (${rowCount} rows)`,
    );
  }
} finally {
  await browser.close();
  server?.kill();
}

const rows = fixtureSamples.flatMap((sample) =>
  sample?.detected
    ? sample.rows.map((row) => ({
        fixtureId: sample.fixtureId,
        imagePath: sample.imagePath,
        ...row,
      }))
    : [],
);

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "fixture-mediapipe-browser-placement-export",
      fixtureCount: fixtureSamples.length,
      detectedFixtureCount: fixtureSamples.filter((sample) => sample?.detected)
        .length,
      rowCount: rows.length,
      positiveCount: rows.filter((row) => row.label === 1).length,
      rows,
    },
    null,
    2,
  )}\n`,
  "utf8",
);

console.log(`Wrote ${outputPath.replace(`${root}/`, "")}`);
