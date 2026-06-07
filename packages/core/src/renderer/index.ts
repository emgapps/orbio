import { CssFallbackRenderer } from "./css-fallback-renderer";
import type { OrbRenderer } from "./types";
import { WebGlOrbRenderer } from "./webgl-renderer";
import type { OrbCallbacks, OrbSettings, ResolvedOrbTheme } from "../types";

export function createRenderer(
  settings: OrbSettings,
  theme: ResolvedOrbTheme,
  callbacks: Pick<OrbCallbacks, "onError"> = {},
): OrbRenderer {
  try {
    return new WebGlOrbRenderer(settings);
  } catch (error) {
    callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
    return new CssFallbackRenderer(settings, theme);
  }
}
