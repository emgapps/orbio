import type { RenderFrameInput, OrbRenderer } from "./types";
import type { OrbSettings, OrbState, ResolvedOrbTheme } from "../types";

export class CssFallbackRenderer implements OrbRenderer {
  readonly element: HTMLDivElement;

  constructor(settings: OrbSettings, theme: ResolvedOrbTheme) {
    this.element = document.createElement("div");
    this.element.className = "emgapps-orb-fallback";
    this.element.dataset.renderer = "css";
    this.element.style.borderRadius = "999px";
    this.element.style.pointerEvents = "none";
    this.element.style.willChange = "transform, box-shadow, background, filter";
    this.element.style.transition = "box-shadow 120ms linear, filter 120ms linear, opacity 120ms linear";
    this.resize(settings);
    this.paint(theme, 0, settings, "idle");
  }

  resize(settings: OrbSettings) {
    this.element.style.width = `${settings.size}px`;
    this.element.style.height = `${settings.size}px`;
  }

  render(input: RenderFrameInput) {
    this.resize(input.settings);
    this.paint(input.theme, input.signal.energy, input.settings, input.state);

    const disabled = input.state === "disabled";
    const scale = disabled ? 0.96 : 1 + input.signal.energy * 0.08 * input.settings.pulseStrength;
    this.element.style.filter = disabled ? "grayscale(0.9) saturate(0.12) brightness(0.78)" : "none";
    this.element.style.opacity = disabled ? "0.62" : "1";
    this.element.style.transform = `scale(${scale.toFixed(4)})`;
  }

  destroy() {
    this.element.remove();
  }

  private paint(theme: ResolvedOrbTheme, energy: number, settings: OrbSettings, state: OrbState) {
    const bottom = rgb(theme.colors.bottom);
    const middle = rgb(theme.colors.middle);
    const top = rgb(theme.colors.top);
    const disabled = state === "disabled";
    const error = state === "error";
    const aura = error ? "rgb(255, 35, 52)" : rgb(theme.colors.auraA);
    const glowBase = 18 + Math.round((energy * 34 + 16) * settings.glowStrength);
    const glow = Math.round(glowBase * (disabled ? 0.34 : error ? 1.12 : 1));
    const glowAlpha = disabled ? 0.14 : error ? 0.44 : 0.36;

    this.element.dataset.visualState = disabled ? "unavailable" : error ? "error" : "normal";
    this.element.dataset.visualOverlay = error ? "red-gradient" : "none";

    const background = [
      `radial-gradient(circle at 35% 28%, rgba(255,255,255,.72), transparent 24%)`,
    ];

    if (error) {
      background.push(`linear-gradient(135deg, rgba(255,42,72,.58), rgba(128,0,14,.24) 54%, transparent 82%)`);
    }

    background.push(`radial-gradient(circle at 50% 55%, ${top} 0%, ${middle} 48%, ${bottom} 100%)`);

    this.element.style.background = background.join(", ");
    this.element.style.boxShadow = `0 0 ${glow}px ${Math.round(glow / 4)}px ${rgba(aura, glowAlpha)}`;
  }
}

function rgb(color: [number, number, number]) {
  return `rgb(${color.map((value) => Math.round(value * 255)).join(", ")})`;
}

function rgba(rgbValue: string, alpha: number) {
  return rgbValue.replace("rgb(", "rgba(").replace(")", `, ${alpha})`);
}
