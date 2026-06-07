import type { OrbPosition } from "../types";

export type DragBounds = {
  width: number;
  height: number;
};

export function clampPosition(
  position: OrbPosition,
  viewport: DragBounds,
  orb: DragBounds,
): OrbPosition {
  return {
    x: clamp(position.x, 0, Math.max(0, viewport.width - orb.width)),
    y: clamp(position.y, 0, Math.max(0, viewport.height - orb.height)),
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
