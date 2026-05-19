import { describe, expect, it } from "vitest";

import metadata from "../../public/models/nail-placement.metadata.json";
import training from "../../public/models/nail-placement.training.json";
import {
  nailPlacementFeatureNames,
  nailPlacementOutputNames,
} from "./nailPlacement";

describe("nail placement model artifacts", () => {
  it("keeps browser features aligned with placement metadata", () => {
    expect(metadata.featureNames).toEqual([...nailPlacementFeatureNames]);
    expect(metadata.outputNames).toEqual([...nailPlacementOutputNames]);
    expect(metadata.modelVersion).toBe("fixture-placement-mlp-v1");
  });

  it("stores positive placement rows matching the feature width", () => {
    expect(training.rowCount).toBe(training.rows.length);
    expect(training.positiveCount).toBeGreaterThan(0);
    expect(
      training.rows.every(
        (row) => row.features.length === metadata.featureNames.length,
      ),
    ).toBe(true);
  });
});
