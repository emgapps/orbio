import type { RenderFrameInput, OrbRenderer } from "./types";
import type { OrbSettings, ResolvedOrbTheme } from "../types";

export class CssFallbackRenderer implements OrbRenderer {
  readonly element: HTMLDivElement;

  constructor(settings: OrbSettings, theme: ResolvedOrbTheme) {
    this.element = document.createElement("div");
    this.element.className = "voca-orb-fallback";
    this.element.dataset.renderer = "css";
    this.element.style.borderRadius = "999px";
    this.element.style.pointerEvents = "none";
    this.element.style.willChange = "transform, box-shadow, background";
    this.element.style.transition = "box-shadow 120ms linear";
    this.resize(settings);
    this.paint(theme, 0, settings);
  }

  resize(settings: OrbSettings) {
    this.element.style.width = `${settings.size}px`;
    this.element.style.height = `${settings.size}px`;
  }

  render(input: RenderFrameInput) {
    this.resize(input.settings);
    this.paint(input.theme, input.signal.energy, input.settings);

    const disabled = input.state === "disabled";
    const scale = disabled ? 0.96 : 1 + input.signal.energy * 0.08 * input.settings.pulseStrength;
    this.element.style.opacity = disabled ? "0.48" : "1";
    this.element.style.transform = `scale(${scale.toFixed(4)})`;
  }

  destroy() {
    this.element.remove();
  }

  private paint(theme: ResolvedOrbTheme, energy: number, settings: OrbSettings) {
    const bottom = rgb(theme.colors.bottom);
    const middle = rgb(theme.colors.middle);
    const top = rgb(theme.colors.top);
    const aura = rgb(theme.colors.auraA);
    const glow = 18 + Math.round((energy * 34 + 16) * settings.glowStrength);

    this.element.style.background = [
      `radial-gradient(circle at 35% 28%, rgba(255,255,255,.72), transparent 24%)`,
      `radial-gradient(circle at 50% 55%, ${top} 0%, ${middle} 48%, ${bottom} 100%)`,
    ].join(", ");
    this.element.style.boxShadow = `0 0 ${glow}px ${Math.round(glow / 4)}px ${rgba(aura, 0.36)}`;
  }
}

function rgb(color: [number, number, number]) {
  return `rgb(${color.map((value) => Math.round(value * 255)).join(" ")})`;
}

function rgba(rgbValue: string, alpha: number) {
  return rgbValue.replace("rgb(", "rgba(").replace(")", ` / ${alpha})`);
}
