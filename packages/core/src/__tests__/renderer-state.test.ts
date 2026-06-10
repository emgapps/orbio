import { describe, expect, it } from "vitest";
import { defaultSettings } from "../settings";
import { CssFallbackRenderer } from "../renderer/css-fallback-renderer";
import type { RenderFrameInput } from "../renderer/types";
import { getStateEffectMode } from "../renderer/webgl-renderer";
import { resolveTheme } from "../themes";
import type { OrbState } from "../types";

describe("orb renderer state visuals", () => {
  it("maps orb states to WebGL state modes", () => {
    expect(getStateEffectMode("idle")).toBe(0);
    expect(getStateEffectMode("speaking")).toBe(0);
    expect(getStateEffectMode("disabled")).toBe(1);
    expect(getStateEffectMode("error")).toBe(2);
  });

  it("applies unavailable styling in the CSS fallback renderer", () => {
    const renderer = new CssFallbackRenderer(defaultSettings, resolveTheme("default"));

    renderer.render(createFrame("disabled"));

    expect(renderer.element.style.filter).toContain("grayscale(0.9)");
    expect(renderer.element.style.filter).toContain("saturate(0.12)");
    expect(renderer.element.style.opacity).toBe("0.62");
    expect(renderer.element.dataset.visualState).toBe("unavailable");
    expect(renderer.element.dataset.visualOverlay).toBe("none");
    expect(renderer.element.getAttribute("style")).toContain("rgba(143, 135, 245, 0.14)");
  });

  it("applies red overlay styling in the CSS fallback renderer", () => {
    const renderer = new CssFallbackRenderer(defaultSettings, resolveTheme("default"));

    renderer.render(createFrame("error"));

    expect(renderer.element.style.filter).toBe("none");
    expect(renderer.element.style.opacity).toBe("1");
    expect(renderer.element.dataset.visualState).toBe("error");
    expect(renderer.element.dataset.visualOverlay).toBe("red-gradient");
    expect(renderer.element.getAttribute("style")).toContain("rgba(255, 35, 52, 0.44)");
  });
});

function createFrame(state: OrbState): RenderFrameInput {
  return {
    time: 0,
    signal: { rms: 0.2, energy: 0.4, pulse: 0.3 },
    settings: defaultSettings,
    theme: resolveTheme("default"),
    state,
  };
}
