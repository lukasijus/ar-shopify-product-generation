import { describe, expect, it } from "vitest";

import metadata from "../../public/models/nail-visibility.metadata.json";
import training from "../../public/models/nail-visibility.training.json";
import { nailVisibilityFeatureNames } from "./nailVisibility";

describe("nail visibility model artifacts", () => {
  it("keeps the browser feature extractor aligned with model metadata", () => {
    expect(metadata.featureNames).toEqual([...nailVisibilityFeatureNames]);
    expect(metadata.modelVersion).toBe("fixture-trained-v1");
    expect(metadata.trainingMetrics.rowCount).toBeGreaterThan(0);
  });

  it("stores labeled fixture rows matching the model feature width", () => {
    expect(training.rowCount).toBe(training.rows.length);
    expect(training.positiveCount).toBeGreaterThan(0);
    expect(training.negativeCount).toBeGreaterThan(0);
    expect(
      training.rows.every(
        (row) => row.features.length === metadata.featureNames.length,
      ),
    ).toBe(true);
  });
});
