import { describe, expect, it } from "vitest";
import { defaultSettings, resolveSettings } from "../settings";

describe("resolveSettings", () => {
  it("uses default settings when no layers are provided", () => {
    expect(resolveSettings()).toEqual(defaultSettings);
  });

  it("merges later setting layers over earlier layers", () => {
    expect(resolveSettings({ size: 80, speed: 0.5 }, { size: 120 })).toMatchObject({
      size: 120,
      speed: 0.5,
    });
  });

  it("clamps unsafe values into the MVP range", () => {
    expect(resolveSettings({ size: 1, sensitivity: 10, dprCap: 99 })).toMatchObject({
      size: 32,
      sensitivity: 4,
      dprCap: 3,
    });
  });
});
