import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  findFixtureById,
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
    ]);
  });

  it("points every fixture at a committed public image", () => {
    handFixtures.forEach((fixture) => {
      const publicPath = fixture.imagePath.replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", publicPath))).toBe(true);

      if ("targetImagePath" in fixture && fixture.targetImagePath) {
        const targetPublicPath = fixture.targetImagePath.replace(/^\//, "");
        expect(
          existsSync(join(process.cwd(), "public", targetPublicPath)),
        ).toBe(true);
      }
    });
  });

  it("marks hidden-nail fixtures as no-overlay cases", () => {
    const negativeFixtures = handFixtures.filter(
      (fixture) => !fixture.visibleNails,
    );

    expect(negativeFixtures).toHaveLength(8);
    expect(
      negativeFixtures.every((fixture) => !shouldRenderNailOverlay(fixture)),
    ).toBe(true);
    expect(
      handFixtures
        .filter((fixture) => fixture.visibleNails)
        .every((fixture) => shouldRenderNailOverlay(fixture)),
    ).toBe(true);
  });

  it("falls back to the baseline fixture for unknown ids", () => {
    expect(findFixtureById("missing").id).toBe("back-hand-flat-good-light");
    expect(findFixtureById(null).id).toBe("back-hand-flat-good-light");
  });
});
