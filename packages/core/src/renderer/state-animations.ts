import type { OrbState } from "../types";

const errorShakeDuration = 0.42;
const errorShakePixels = 3.2;

export type ShakeOffset = {
  x: number;
  y: number;
};

export class ErrorShakeTransition {
  private previousState: OrbState | null = null;
  private shakeStartTime: number | null = null;

  update(state: OrbState, time: number): ShakeOffset {
    if (this.previousState !== state) {
      if (state === "error" && this.previousState !== null) {
        this.shakeStartTime = time;
      }

      this.previousState = state;
    }

    if (this.shakeStartTime === null) {
      return { x: 0, y: 0 };
    }

    const elapsed = Math.max(0, time - this.shakeStartTime);
    const offset = getErrorShakeOffset(elapsed);

    if (elapsed >= errorShakeDuration) {
      this.shakeStartTime = null;
    }

    return offset;
  }
}

export function getErrorShakeOffset(elapsed: number): ShakeOffset {
  if (elapsed <= 0 || elapsed >= errorShakeDuration) {
    return { x: 0, y: 0 };
  }

  const progress = elapsed / errorShakeDuration;
  const decay = Math.pow(1 - progress, 1.6);

  return {
    x: Math.sin(elapsed * 92) * errorShakePixels * decay,
    y: Math.sin(elapsed * 146 + 0.65) * errorShakePixels * 0.28 * decay,
  };
}
