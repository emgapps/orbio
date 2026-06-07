import { clampPosition } from "./math";
import type { OrbCallbacks, OrbPosition } from "../types";

type DragControllerOptions = Pick<OrbCallbacks, "onPositionChange"> & {
  element: HTMLElement;
  initialPosition: OrbPosition;
  enabled: boolean;
  getSize: () => { width: number; height: number };
  getViewport: () => { width: number; height: number };
};

export type DragController = {
  setEnabled(enabled: boolean): void;
  setPosition(position: OrbPosition): void;
  getPosition(): OrbPosition;
  destroy(): void;
};

export function createDragController(options: DragControllerOptions): DragController {
  let enabled = options.enabled;
  let position = clampPosition(options.initialPosition, options.getViewport(), options.getSize());
  let activePointerId: number | null = null;
  let startPointer = { x: 0, y: 0 };
  let startPosition = position;

  const applyPosition = (next: OrbPosition, notify: boolean) => {
    position = clampPosition(next, options.getViewport(), options.getSize());
    options.element.style.left = `${position.x}px`;
    options.element.style.top = `${position.y}px`;
    if (notify) options.onPositionChange?.(position);
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!enabled || event.button !== 0) return;

    activePointerId = event.pointerId;
    startPointer = { x: event.clientX, y: event.clientY };
    startPosition = position;
    options.element.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const onPointerMove = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;

    applyPosition(
      {
        x: startPosition.x + event.clientX - startPointer.x,
        y: startPosition.y + event.clientY - startPointer.y,
      },
      true,
    );
  };

  const onPointerUp = (event: PointerEvent) => {
    if (activePointerId !== event.pointerId) return;
    options.element.releasePointerCapture?.(event.pointerId);
    activePointerId = null;
  };

  options.element.addEventListener("pointerdown", onPointerDown);
  options.element.addEventListener("pointermove", onPointerMove);
  options.element.addEventListener("pointerup", onPointerUp);
  options.element.addEventListener("pointercancel", onPointerUp);
  applyPosition(position, false);

  return {
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      options.element.style.cursor = enabled ? "grab" : "default";
    },
    setPosition(nextPosition) {
      applyPosition(nextPosition, false);
    },
    getPosition() {
      return position;
    },
    destroy() {
      options.element.removeEventListener("pointerdown", onPointerDown);
      options.element.removeEventListener("pointermove", onPointerMove);
      options.element.removeEventListener("pointerup", onPointerUp);
      options.element.removeEventListener("pointercancel", onPointerUp);
    },
  };
}
