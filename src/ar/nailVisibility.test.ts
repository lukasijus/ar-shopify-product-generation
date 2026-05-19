import { describe, expect, it } from "vitest";

import {
  computeNailOverlaysWithVisibility,
  fingerConfigs,
  type Landmark,
} from "./nailGeometry";
import {
  extractNailVisibilityFeatures,
  HeuristicNailVisibilityModel,
  nailVisibilityFeatureNames,
} from "./nailVisibility";

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

describe("nail visibility model features", () => {
  it("extracts a finite fixed-width feature vector", () => {
    const features = extractNailVisibilityFeatures(
      fingerConfigs[1],
      createOpenHandLandmarks(),
      { width: 1_000, height: 1_000 },
    );

    expect(features.values).toHaveLength(nailVisibilityFeatureNames.length);
    expect(features.values.every(Number.isFinite)).toBe(true);
    expect(features.reasons).toEqual([]);
  });

  it("uses the heuristic model to suppress curled fingers", async () => {
    const landmarks = createOpenHandLandmarks();
    landmarks[15] = { x: 0.7, y: 0.3 };
    landmarks[16] = { x: 0.66, y: 0.46 };
    const ring = fingerConfigs.find((config) => config.finger === "ring");

    const decision = await new HeuristicNailVisibilityModel().predict(
      ring!,
      landmarks,
      { width: 1_000, height: 1_000 },
    );

    expect(decision.visible).toBe(false);
    expect(decision.source).toBe("heuristic");
    expect(decision.reasons).toContain("folded-finger");
  });

  it("can drive overlay placement from an async visibility gate", async () => {
    const overlays = await computeNailOverlaysWithVisibility(
      createOpenHandLandmarks(),
      { width: 1_000, height: 1_000 },
      async (config) => config.finger === "index",
    );

    expect(overlays.map((overlay) => overlay.finger)).toEqual(["index"]);
  });
});
