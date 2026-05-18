import { describe, expect, it } from "vitest";

import { getNailAssetUrl } from "./nailAssets";

describe("getNailAssetUrl", () => {
  it("builds the public extracted asset URL for a product finger", () => {
    expect(getNailAssetUrl("blush-sparkle", "index")).toBe(
      "/nail-assets/blush-sparkle/index.png",
    );
  });
});
