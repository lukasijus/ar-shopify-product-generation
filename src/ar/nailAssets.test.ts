import { describe, expect, it } from "vitest";

import { getNailAssetMetadataUrl, getNailAssetUrl } from "./nailAssets";

describe("getNailAssetUrl", () => {
  it("builds the public canonical asset URL for a product finger", () => {
    expect(getNailAssetUrl("blush-sparkle", "index")).toBe(
      "/nail-assets/blush-sparkle/canonical/index.png",
    );
  });

  it("builds the public metadata URL for an asset set", () => {
    expect(getNailAssetMetadataUrl("blush-sparkle")).toBe(
      "/nail-assets/blush-sparkle/metadata.json",
    );
  });
});
