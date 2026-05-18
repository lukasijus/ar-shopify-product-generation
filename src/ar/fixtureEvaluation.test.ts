import { describe, expect, it } from "vitest";

import type { HandFixture } from "../app/fixtureManifest";
import { evaluateFixtureRender } from "./fixtureEvaluation";
import type { NailOverlay } from "./nailGeometry";

const fixture = (
  expectedVisibleFingers: HandFixture["expectedVisibleFingers"],
) =>
  ({
    id: "fixture",
    label: "Fixture",
    imagePath: "/fixture.png",
    expectedDifficulty: "baseline",
    visibleNails: expectedVisibleFingers.length > 0,
    expectedVisibleFingers,
    notes: "",
  }) satisfies HandFixture;

const overlay = (finger: NailOverlay["finger"]): NailOverlay => ({
  finger,
  centerX: 10,
  centerY: 10,
  width: 8,
  height: 16,
  angle: 0,
  color: "#fff",
  accentColor: "#eee",
});

const allInsideBounds = (total: number) => ({
  total,
  finite: total,
  mostlyInside: total,
});

describe("evaluateFixtureRender", () => {
  it("passes when rendered fingers match expected fingers", () => {
    expect(
      evaluateFixtureRender(
        fixture(["thumb", "index"]),
        [overlay("thumb"), overlay("index")],
        allInsideBounds(2),
        null,
      ),
    ).toMatchObject({
      passed: true,
      flags: [],
      missingFingers: [],
      extraFingers: [],
    });
  });

  it("flags missing and extra overlays", () => {
    expect(
      evaluateFixtureRender(
        fixture(["thumb"]),
        [overlay("index")],
        allInsideBounds(1),
        null,
      ),
    ).toMatchObject({
      passed: false,
      flags: ["missingOverlay", "extraOverlay"],
      missingFingers: ["thumb"],
      extraFingers: ["index"],
    });
  });

  it("flags off-canvas and high-diff results", () => {
    expect(
      evaluateFixtureRender(
        fixture(["thumb"]),
        [overlay("thumb")],
        { total: 1, finite: 1, mostlyInside: 0 },
        {
          compared: true,
          averageDifference: 80,
          changedPixelRatio: 0.5,
        },
      ).flags,
    ).toEqual(["offCanvas", "targetDiffTooHigh"]);
  });
});
