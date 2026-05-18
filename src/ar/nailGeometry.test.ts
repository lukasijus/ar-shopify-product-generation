import { describe, expect, it } from "vitest";

import {
  computeNailOverlays,
  selectNailAssetVariant,
  type Landmark,
} from "./nailGeometry";

const createOpenHandLandmarks = (): Landmark[] => [
  { x: 0.5, y: 0.86 },
  { x: 0.38, y: 0.68 },
  { x: 0.28, y: 0.52 },
  { x: 0.2, y: 0.38 },
  { x: 0.14, y: 0.26 },
  { x: 0.44, y: 0.58 },
  { x: 0.41, y: 0.42 },
  { x: 0.39, y: 0.28 },
  { x: 0.38, y: 0.16 },
  { x: 0.54, y: 0.56 },
  { x: 0.54, y: 0.38 },
  { x: 0.54, y: 0.22 },
  { x: 0.54, y: 0.1 },
  { x: 0.64, y: 0.6 },
  { x: 0.68, y: 0.44 },
  { x: 0.7, y: 0.3 },
  { x: 0.72, y: 0.2 },
  { x: 0.74, y: 0.66 },
  { x: 0.81, y: 0.52 },
  { x: 0.86, y: 0.4 },
  { x: 0.9, y: 0.3 },
];

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
    expect(overlays.map((overlay) => overlay.variant)).toEqual([
      "angled",
      "front",
      "front",
      "front",
      "front",
    ]);
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

  it("filters out curled fingers while keeping extended fingers", () => {
    const landmarks = createOpenHandLandmarks();
    landmarks[15] = { x: 0.7, y: 0.3 };
    landmarks[16] = { x: 0.66, y: 0.46 };
    landmarks[19] = { x: 0.86, y: 0.4 };
    landmarks[20] = { x: 0.8, y: 0.56 };

    const overlays = computeNailOverlays(landmarks, {
      width: 1_000,
      height: 1_000,
    });

    expect(overlays.map((overlay) => overlay.finger)).toEqual([
      "thumb",
      "index",
      "middle",
    ]);
  });

  it("can limit overlays to an expected visible finger set", () => {
    const overlays = computeNailOverlays(
      createOpenHandLandmarks(),
      {
        width: 1_000,
        height: 1_000,
      },
      { allowedFingers: ["index", "middle"] },
    );

    expect(overlays.map((overlay) => overlay.finger)).toEqual([
      "index",
      "middle",
    ]);
  });

  it("selects front, angled, and side variants from finger direction", () => {
    expect(selectNailAssetVariant("index", 2, 10)).toBe("front");
    expect(selectNailAssetVariant("index", 8, 10)).toBe("angled");
    expect(selectNailAssetVariant("thumb", 10, 4)).toBe("side");
  });
});
