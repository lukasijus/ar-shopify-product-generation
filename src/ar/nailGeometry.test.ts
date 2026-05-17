import { describe, expect, it } from "vitest";

import { computeNailOverlays, type Landmark } from "./nailGeometry";

const createOpenHandLandmarks = (): Landmark[] =>
  Array.from({ length: 21 }, (_, index) => ({
    x: 0.5,
    y: 0.8 - index * 0.01,
  }));

describe("computeNailOverlays", () => {
  it("returns no overlays until a full hand is present", () => {
    expect(computeNailOverlays([], { width: 640, height: 480 })).toEqual([]);
  });

  it("computes one overlay for each fingernail", () => {
    const overlays = computeNailOverlays(createOpenHandLandmarks(), {
      width: 640,
      height: 480,
    });

    expect(overlays.map((overlay) => overlay.finger)).toEqual([
      "thumb",
      "index",
      "middle",
      "ring",
      "pinky",
    ]);
    expect(overlays).toHaveLength(5);
    expect(overlays.every((overlay) => overlay.width > 0)).toBe(true);
    expect(overlays.every((overlay) => overlay.height > 0)).toBe(true);
  });

  it("places the index overlay between the fingertip and dip landmark", () => {
    const landmarks = createOpenHandLandmarks();
    landmarks[7] = { x: 0.4, y: 0.4 };
    landmarks[8] = { x: 0.4, y: 0.2 };

    const overlays = computeNailOverlays(landmarks, {
      width: 1_000,
      height: 1_000,
    });
    const indexOverlay = overlays.find((overlay) => overlay.finger === "index");

    expect(indexOverlay?.centerX).toBeCloseTo(400);
    expect(indexOverlay?.centerY).toBeGreaterThan(200);
    expect(indexOverlay?.centerY).toBeLessThan(400);
  });

  it("sizes overlays from the distal fingertip segment instead of the whole finger", () => {
    const landmarks = createOpenHandLandmarks();
    landmarks[6] = { x: 0.4, y: 0.62 };
    landmarks[7] = { x: 0.4, y: 0.4 };
    landmarks[8] = { x: 0.4, y: 0.28 };

    const overlays = computeNailOverlays(landmarks, {
      width: 1_000,
      height: 1_000,
    });
    const indexOverlay = overlays.find((overlay) => overlay.finger === "index");

    expect(indexOverlay?.height).toBeLessThan(120);
    expect(indexOverlay?.width).toBeLessThan(70);
  });
});
