import type { NailOverlay, OverlayCanvasSize } from "./nailGeometry";

export type OverlayBoundsSummary = {
  total: number;
  finite: number;
  mostlyInside: number;
};

export const summarizeOverlayBounds = (
  overlays: NailOverlay[],
  size: OverlayCanvasSize,
): OverlayBoundsSummary => {
  return overlays.reduce<OverlayBoundsSummary>(
    (summary, overlay) => {
      const finite = [
        overlay.centerX,
        overlay.centerY,
        overlay.width,
        overlay.height,
        overlay.angle,
      ].every(Number.isFinite);
      const horizontalPadding = overlay.width * 0.75;
      const verticalPadding = overlay.height * 0.75;
      const mostlyInside =
        overlay.centerX >= -horizontalPadding &&
        overlay.centerX <= size.width + horizontalPadding &&
        overlay.centerY >= -verticalPadding &&
        overlay.centerY <= size.height + verticalPadding;

      return {
        total: summary.total + 1,
        finite: summary.finite + (finite ? 1 : 0),
        mostlyInside: summary.mostlyInside + (mostlyInside ? 1 : 0),
      };
    },
    { total: 0, finite: 0, mostlyInside: 0 },
  );
};
