import type { BuiltInThemeName, OrbState, OrbTheme, ResolvedOrbTheme } from "../types";

export const builtInThemes: Record<BuiltInThemeName, OrbTheme> = {
  default: {
    name: "default",
    colors: {
      bottom: "#ff9473",
      middle: "#c48ce0",
      top: "#737df2",
      auraA: "#8f87f5",
      auraB: "#ffaa85",
      rim: "#c7bdff",
    },
  },
  calm: {
    name: "calm",
    colors: {
      bottom: "#8fd7c7",
      middle: "#8fb6e8",
      top: "#f1d7a3",
      auraA: "#8fd7c7",
      auraB: "#f1d7a3",
      rim: "#d7fff5",
    },
    visual: {
      speed: 0.72,
      pulseStrength: 0.48,
      glowStrength: 0.62,
    },
  },
  cosmic: {
    name: "cosmic",
    colors: {
      bottom: "#ff6b8f",
      middle: "#9058ff",
      top: "#4fd6ff",
      auraA: "#6b5cff",
      auraB: "#ff6b8f",
      rim: "#d8f7ff",
    },
    visual: {
      speed: 1.18,
      pulseStrength: 0.95,
      glowStrength: 1.1,
    },
    states: {
      speaking: {
        glowStrength: 1.25,
      },
    },
  },
};

const fallbackTheme = builtInThemes.default;

export function resolveTheme(theme: BuiltInThemeName | OrbTheme = "default"): ResolvedOrbTheme {
  const source = typeof theme === "string" ? builtInThemes[theme] ?? fallbackTheme : theme;
  const colors = source.colors;

  return {
    name: source.name ?? "custom",
    colors: {
      bottom: parseColor(colors.bottom),
      middle: parseColor(colors.middle),
      top: parseColor(colors.top),
      auraA: parseColor(colors.auraA ?? colors.top),
      auraB: parseColor(colors.auraB ?? colors.bottom),
      rim: parseColor(colors.rim ?? "#ffffff"),
    },
    visual: source.visual ?? {},
    states: source.states ?? {},
  };
}

export function getThemeSettings(theme: ResolvedOrbTheme, state: OrbState) {
  return {
    ...theme.visual,
    ...(theme.states[state] ?? {}),
  };
}

export function parseColor(color: string): [number, number, number] {
  const normalized = color.trim();

  if (/^#[0-9a-fA-F]{3}$/.test(normalized)) {
    const [, r, g, b] = normalized;
    return [hexPairToUnit(`${r}${r}`), hexPairToUnit(`${g}${g}`), hexPairToUnit(`${b}${b}`)];
  }

  if (/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return [
      hexPairToUnit(normalized.slice(1, 3)),
      hexPairToUnit(normalized.slice(3, 5)),
      hexPairToUnit(normalized.slice(5, 7)),
    ];
  }

  throw new Error(`Unsupported orb color "${color}". Use #rgb or #rrggbb.`);
}

function hexPairToUnit(pair: string) {
  return Number.parseInt(pair, 16) / 255;
}
