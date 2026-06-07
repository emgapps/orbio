import { describe, expect, it } from "vitest";
import { getThemeSettings, parseColor, resolveTheme } from "../themes";

describe("theme resolution", () => {
  it("resolves built-in theme colors into WebGL RGB triples", () => {
    const theme = resolveTheme("default");

    expect(theme.name).toBe("default");
    expect(theme.colors.bottom).toHaveLength(3);
    expect(theme.colors.bottom[0]).toBeGreaterThan(0);
  });

  it("supports custom #rgb and #rrggbb colors", () => {
    expect(parseColor("#fff")).toEqual([1, 1, 1]);
    expect(parseColor("#0000ff")).toEqual([0, 0, 1]);
  });

  it("combines base and state-specific visual overrides", () => {
    const theme = resolveTheme({
      name: "test",
      colors: {
        bottom: "#000",
        middle: "#fff",
        top: "#00f",
      },
      visual: {
        speed: 0.5,
      },
      states: {
        speaking: {
          glowStrength: 1.2,
        },
      },
    });

    expect(getThemeSettings(theme, "speaking")).toEqual({
      speed: 0.5,
      glowStrength: 1.2,
    });
  });
});
