import { describe, expect, it } from "vitest";

import { summarizePixelDifference } from "./targetComparison";

const makePixels = (rgb: [number, number, number], pixelCount = 4) =>
  Uint8ClampedArray.from(
    Array.from({ length: pixelCount }, () => [...rgb, 255]).flat(),
  );

describe("summarizePixelDifference", () => {
  it("reports no difference for identical pixels", () => {
    const pixels = makePixels([255, 255, 255]);

    expect(summarizePixelDifference(pixels, pixels)).toMatchObject({
      averageDifference: 0,
      changedPixelRatio: 0,
    });
  });

  it("reports a larger average difference for different pixels", () => {
    const summary = summarizePixelDifference(
      makePixels([0, 0, 0]),
      makePixels([255, 255, 255]),
    );

    expect(summary.averageDifference).toBeGreaterThan(200);
    expect(summary.changedPixelRatio).toBe(1);
  });
});
