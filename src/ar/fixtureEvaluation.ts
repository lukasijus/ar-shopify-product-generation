import type { HandFixture } from "../app/fixtureManifest";
import type { FingerName, NailOverlay } from "./nailGeometry";
import type { OverlayBoundsSummary } from "./overlayBounds";
import type { TargetComparisonSummary } from "./targetComparison";

export type FixtureJudgmentFlag =
  | "missingOverlay"
  | "extraOverlay"
  | "offCanvas"
  | "aspectMismatch"
  | "targetDiffTooHigh";

export type FixtureEvaluation = {
  passed: boolean;
  renderedFingers: FingerName[];
  missingFingers: FingerName[];
  extraFingers: FingerName[];
  flags: FixtureJudgmentFlag[];
};

const targetAverageDifferenceLimit = 42;
const targetChangedPixelRatioLimit = 0.28;
const minimumOverlayAspectRatio = 1.2;
const maximumOverlayAspectRatio = 2.8;

export const evaluateFixtureRender = (
  fixture: HandFixture,
  overlays: NailOverlay[],
  bounds: OverlayBoundsSummary,
  comparison: TargetComparisonSummary | null,
): FixtureEvaluation => {
  const expectedFingers = new Set(fixture.expectedVisibleFingers);
  const renderedFingers = overlays.map((overlay) => overlay.finger);
  const renderedFingerSet = new Set(renderedFingers);
  const missingFingers = fixture.expectedVisibleFingers.filter(
    (finger) => !renderedFingerSet.has(finger),
  );
  const extraFingers = renderedFingers.filter(
    (finger) => !expectedFingers.has(finger),
  );
  const flags: FixtureJudgmentFlag[] = [];

  if (missingFingers.length > 0) {
    flags.push("missingOverlay");
  }

  if (extraFingers.length > 0) {
    flags.push("extraOverlay");
  }

  if (bounds.finite !== bounds.total || bounds.mostlyInside !== bounds.total) {
    flags.push("offCanvas");
  }

  if (
    overlays.some((overlay) => {
      const aspectRatio = overlay.height / Math.max(overlay.width, 1);

      return (
        aspectRatio < minimumOverlayAspectRatio ||
        aspectRatio > maximumOverlayAspectRatio
      );
    })
  ) {
    flags.push("aspectMismatch");
  }

  if (
    comparison?.compared &&
    (comparison.averageDifference > targetAverageDifferenceLimit ||
      comparison.changedPixelRatio > targetChangedPixelRatioLimit)
  ) {
    flags.push("targetDiffTooHigh");
  }

  return {
    passed: flags.length === 0,
    renderedFingers,
    missingFingers,
    extraFingers,
    flags,
  };
};

export const formatFixtureEvaluation = (
  evaluation: FixtureEvaluation,
): string => {
  if (evaluation.passed) {
    return "Judgment: pass";
  }

  return `Judgment: needs tuning (${evaluation.flags.join(", ")})`;
};
