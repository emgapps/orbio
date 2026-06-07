import type { OrbAudioSignal, OrbSettings, OrbState, ResolvedOrbTheme } from "../types";

export type RenderFrameInput = {
  time: number;
  signal: OrbAudioSignal;
  settings: OrbSettings;
  theme: ResolvedOrbTheme;
  state: OrbState;
};

export type OrbRenderer = {
  readonly element: HTMLElement;
  resize(settings: OrbSettings): void;
  render(input: RenderFrameInput): void;
  destroy(): void;
};
