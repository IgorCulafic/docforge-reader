export type SidebarSide = "left" | "right";

export interface SidebarWidths {
  left: number;
  right: number;
}

export const defaultSidebarWidths: SidebarWidths = {
  left: 286,
  right: 310
};

const zoomStep = 0.1;
const minZoom = 0.7;
const maxZoom = 2;

const sidebarLimits: Record<SidebarSide, { min: number; max: number }> = {
  left: { min: 220, max: 520 },
  right: { min: 240, max: 480 }
};

export function clampZoom(value: number): number {
  return clamp(value, minZoom, maxZoom);
}

export function nextZoomFromWheel(current: number, deltaY: number): number {
  const direction = deltaY < 0 ? 1 : -1;
  return clampZoom(roundToStep(current + direction * zoomStep));
}

export function clampSidebarWidth(side: SidebarSide, width: number): number {
  const limits = sidebarLimits[side];
  return Math.round(clamp(width, limits.min, limits.max));
}

export function resetSidebarWidths(): SidebarWidths {
  return { ...defaultSidebarWidths };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundToStep(value: number): number {
  return Math.round(value * 10) / 10;
}
