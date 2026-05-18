import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  defaultPressOnProduct,
  findPressOnProductByHandle,
  pressOnProducts,
} from "./pressOnProducts";

describe("pressOnProducts", () => {
  it("contains the Shopify press-on nail collection", () => {
    expect(pressOnProducts).toHaveLength(12);
    expect(pressOnProducts.map((product) => product.handle)).toEqual([
      "puppy-love",
      "blush-sparkle",
      "crimson-charm",
      "monochrome-muse",
      "cosmic-glam",
      "golden-rose",
      "elegant-bloom",
      "midnight-chic",
      "playful-charms",
      "chrome-starburst",
      "floral-bliss",
      "golden-glow",
    ]);
  });

  it("keeps product metadata usable for try-on links", () => {
    pressOnProducts.forEach((product) => {
      expect(product.productUrl).toBe(
        `https://alwayslikedesign.com/products/${product.handle}`,
      );
      expect(product.imageUrl).toMatch(/^https:\/\/cdn\.shopify\.com\//);
      expect(product.localImagePath).toBe(
        `/shopify/press-ons/source/${product.handle}.png`,
      );
      expect(product.style.baseColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(product.style.accentColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(product.style.tipColor).toMatch(/^#[0-9a-f]{6}$/i);
      if (product.assetHandle) {
        expect(
          existsSync(
            join(
              process.cwd(),
              "public",
              "nail-assets",
              product.assetHandle,
              "metadata.json",
            ),
          ),
        ).toBe(true);
      }
    });
  });

  it("points every product at a downloaded public reference image", () => {
    pressOnProducts.forEach((product) => {
      const publicPath = product.localImagePath.replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", publicPath))).toBe(true);
    });
  });

  it("finds products by handle and falls back to the default product", () => {
    expect(findPressOnProductByHandle("chrome-starburst").title).toBe(
      "Chrome Starburst",
    );
    expect(findPressOnProductByHandle("missing")).toBe(defaultPressOnProduct);
    expect(findPressOnProductByHandle(null)).toBe(defaultPressOnProduct);
  });
});
