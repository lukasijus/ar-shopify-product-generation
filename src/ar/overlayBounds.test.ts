import { describe, expect, it } from "vitest";

import { summarizeOverlayBounds } from "./overlayBounds";
import type { NailOverlay } from "./nailGeometry";

const overlay = (overrides: Partial<NailOverlay> = {}): NailOverlay => ({
  finger: "index",
  variant: "front",
  centerX: 50,
  centerY: 50,
  width: 20,
  height: 40,
  angle: 0,
  color: "#ffffff",
  accentColor: "#eeeeee",
  ...overrides,
});

describe("summarizeOverlayBounds", () => {
  it("counts finite overlays inside the image tolerance", () => {
    expect(
      summarizeOverlayBounds([overlay()], {
        width: 100,
        height: 100,
      }),
    ).toEqual({
      total: 1,
      finite: 1,
      mostlyInside: 1,
    });
  });

  it("flags non-finite and far outside overlays", () => {
    expect(
      summarizeOverlayBounds(
        [overlay({ centerX: Number.NaN }), overlay({ centerX: 1_000 })],
        {
          width: 100,
          height: 100,
        },
      ),
    ).toEqual({
      total: 2,
      finite: 1,
      mostlyInside: 0,
    });
  });
});
