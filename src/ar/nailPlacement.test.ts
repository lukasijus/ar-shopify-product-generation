import { describe, expect, it } from "vitest";

import {
  createNailOverlay,
  fingerConfigs,
  type Landmark,
} from "./nailGeometry";
import {
  applyPlacementPrediction,
  extractNailPlacementFeatures,
  nailPlacementFeatureNames,
} from "./nailPlacement";

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

describe("nail placement model features", () => {
  it("extracts a finite fixed-width feature vector", () => {
    const config = fingerConfigs[1];
    const landmarks = createOpenHandLandmarks();
    const size = { width: 1_000, height: 1_000 };
    const overlay = createNailOverlay(config, landmarks, size);
    const features = extractNailPlacementFeatures(
      config,
      landmarks,
      size,
      overlay,
      0.82,
    );

    expect(features).toHaveLength(nailPlacementFeatureNames.length);
    expect(features.every(Number.isFinite)).toBe(true);
  });

  it("clamps model corrections before applying them", () => {
    const config = fingerConfigs[1];
    const landmarks = createOpenHandLandmarks();
    const overlay = createNailOverlay(config, landmarks, {
      width: 1_000,
      height: 1_000,
    });
    const refined = applyPlacementPrediction(
      overlay,
      [4, -4, 3, -3, 3, 0, 0, 0, 4, 0, 0],
    );

    expect(refined.centerX - overlay.centerX).toBeCloseTo(overlay.width * 0.22);
    expect(refined.centerY - overlay.centerY).toBeCloseTo(
      -overlay.height * 0.22,
    );
    expect(refined.width).toBeGreaterThan(overlay.width);
    expect(refined.height).toBeLessThan(overlay.height);
    expect(refined.variant).toBe("angledLeft");
  });
});
