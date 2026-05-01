import { describe, expect, it } from "vitest";
import { clampSidebarWidth, clampZoom, nextZoomFromWheel, resetSidebarWidths } from "./viewPreferences";

describe("view preferences", () => {
  it("keeps text zoom inside readable bounds", () => {
    expect(clampZoom(0.2)).toBe(0.7);
    expect(clampZoom(1.25)).toBe(1.25);
    expect(clampZoom(3)).toBe(2);
  });

  it("turns Shift wheel movement into stepped text zoom", () => {
    expect(nextZoomFromWheel(1, -10)).toBe(1.1);
    expect(nextZoomFromWheel(1, 10)).toBe(0.9);
    expect(nextZoomFromWheel(2, -10)).toBe(2);
    expect(nextZoomFromWheel(0.7, 10)).toBe(0.7);
  });

  it("clamps sidebar widths to useful desktop ranges", () => {
    expect(clampSidebarWidth("left", 120)).toBe(220);
    expect(clampSidebarWidth("left", 420)).toBe(420);
    expect(clampSidebarWidth("left", 700)).toBe(520);
    expect(clampSidebarWidth("right", 180)).toBe(240);
    expect(clampSidebarWidth("right", 360)).toBe(360);
    expect(clampSidebarWidth("right", 620)).toBe(480);
  });

  it("returns the default sidebar widths for reset", () => {
    expect(resetSidebarWidths()).toEqual({ left: 286, right: 310 });
  });
});
