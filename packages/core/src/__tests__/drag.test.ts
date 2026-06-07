import { describe, expect, it } from "vitest";
import { clampPosition } from "../drag/math";

describe("clampPosition", () => {
  it("keeps the orb inside the viewport", () => {
    expect(
      clampPosition({ x: 999, y: -20 }, { width: 300, height: 200 }, { width: 80, height: 80 }),
    ).toEqual({ x: 220, y: 0 });
  });

  it("falls back to origin when the orb is larger than the viewport", () => {
    expect(
      clampPosition({ x: 40, y: 50 }, { width: 20, height: 20 }, { width: 80, height: 80 }),
    ).toEqual({ x: 0, y: 0 });
  });
});
