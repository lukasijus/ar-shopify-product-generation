import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  findFixtureById,
  getFixtureTargetImagePath,
  handFixtures,
  shouldRenderNailOverlay,
} from "./fixtureManifest";

describe("handFixtures", () => {
  it("lists the expected synthetic fixture set", () => {
    expect(handFixtures.map((fixture) => fixture.id)).toEqual([
      "back-hand-flat-good-light",
      "back-hand-fingers-close",
      "back-hand-angled-left",
      "back-hand-angled-right",
      "back-hand-close-camera",
      "back-hand-far-camera",
      "back-hand-warm-low-light",
      "back-hand-busy-background",
      "closed-fist-knuckles",
      "closed-fist-top",
      "closed-fist-side",
      "sleeve-covered-fingertips",
      "mug-occluded-fingertips",
      "phone-occluded-fingertips",
      "pocket-covered-fingers",
      "fingertips-out-of-frame",
      "v2-thumb-index-visible",
      "v2-all-five-visible",
      "v2-peace-index-middle",
      "v2-thumb-only-visible",
      "v2-index-middle-ring-visible",
      "v2-sideways-thumb-index",
      "v2-fingertips-cropped",
      "v2-no-visible-fist",
      "v2-mug-occluded-thumb-ring",
      "v2-low-light-all-five",
      "v2-busy-background-all-five",
      "v2-ring-pinky-visible",
      "v2-close-fingers-all-five",
      "v2-far-camera-all-five",
    ]);
  });

  it("points every fixture at a committed public image", () => {
    handFixtures.forEach((fixture) => {
      const publicPath = fixture.imagePath.replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", publicPath))).toBe(true);

      const targetImagePath = getFixtureTargetImagePath(
        fixture,
        "blush-sparkle",
      );
      if (targetImagePath) {
        const targetPublicPath = targetImagePath.replace(/^\//, "");
        expect(
          existsSync(join(process.cwd(), "public", targetPublicPath)),
        ).toBe(true);
      }
    });
  });

  it("resolves product-specific fixture targets", () => {
    const fixture = findFixtureById("v2-thumb-only-visible");

    expect(getFixtureTargetImagePath(fixture, "blush-sparkle")).toBe(
      "/test-fixtures/hands/targets/blush-sparkle/thumb-only-visible.png",
    );
    expect(getFixtureTargetImagePath(fixture, "puppy-love")).toBeNull();
  });

  it("marks hidden-nail fixtures as no-overlay cases", () => {
    const negativeFixtures = handFixtures.filter(
      (fixture) => fixture.expectedVisibleFingers.length === 0,
    );

    expect(negativeFixtures).toHaveLength(10);
    expect(
      negativeFixtures.every((fixture) => !shouldRenderNailOverlay(fixture)),
    ).toBe(true);
    expect(
      handFixtures
        .filter((fixture) => fixture.expectedVisibleFingers.length > 0)
        .every((fixture) => shouldRenderNailOverlay(fixture)),
    ).toBe(true);
  });

  it("keeps legacy visibleNails aligned with per-finger expectations", () => {
    expect(
      handFixtures.every(
        (fixture) =>
          fixture.visibleNails === fixture.expectedVisibleFingers.length > 0,
      ),
    ).toBe(true);
  });

  it("falls back to the baseline fixture for unknown ids", () => {
    expect(findFixtureById("missing").id).toBe("back-hand-flat-good-light");
    expect(findFixtureById(null).id).toBe("back-hand-flat-good-light");
  });
});
