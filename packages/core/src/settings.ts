import type { OrbSettings } from "./types";

export const defaultSettings: OrbSettings = {
  size: 96,
  sensitivity: 0.8,
  speed: 1,
  pulseStrength: 0.7,
  glowStrength: 0.85,
  dprCap: 2,
};

const minSettings: OrbSettings = {
  size: 32,
  sensitivity: 0,
  speed: 0,
  pulseStrength: 0,
  glowStrength: 0,
  dprCap: 1,
};

const maxSettings: OrbSettings = {
  size: 320,
  sensitivity: 4,
  speed: 4,
  pulseStrength: 2,
  glowStrength: 2,
  dprCap: 3,
};

export function resolveSettings(
  ...layers: Array<Partial<OrbSettings> | undefined>
): OrbSettings {
  const merged = Object.assign({}, defaultSettings, ...layers);

  return {
    size: clamp(merged.size, minSettings.size, maxSettings.size),
    sensitivity: clamp(merged.sensitivity, minSettings.sensitivity, maxSettings.sensitivity),
    speed: clamp(merged.speed, minSettings.speed, maxSettings.speed),
    pulseStrength: clamp(merged.pulseStrength, minSettings.pulseStrength, maxSettings.pulseStrength),
    glowStrength: clamp(merged.glowStrength, minSettings.glowStrength, maxSettings.glowStrength),
    dprCap: clamp(merged.dprCap, minSettings.dprCap, maxSettings.dprCap),
  };
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}
