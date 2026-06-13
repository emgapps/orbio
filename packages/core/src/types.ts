export type OrbState = "idle" | "speaking" | "error" | "disabled";

export type BuiltInThemeName = "default" | "calm" | "cosmic";

export type OrbPosition = {
  x: number;
  y: number;
};

export type OrbPositionMode = "fixed" | "absolute";

export type OrbSettings = {
  size: number;
  sensitivity: number;
  speed: number;
  pulseStrength: number;
  glowStrength: number;
  dprCap: number;
};

export type OrbTheme = {
  name?: string;
  colors: {
    bottom: string;
    middle: string;
    top: string;
    auraA?: string;
    auraB?: string;
    rim?: string;
  };
  visual?: Partial<OrbSettings>;
  states?: Partial<Record<OrbState, Partial<OrbSettings>>>;
};

export type ResolvedOrbTheme = {
  name: string;
  colors: {
    bottom: [number, number, number];
    middle: [number, number, number];
    top: [number, number, number];
    auraA: [number, number, number];
    auraB: [number, number, number];
    rim: [number, number, number];
  };
  visual: Partial<OrbSettings>;
  states: Partial<Record<OrbState, Partial<OrbSettings>>>;
};

export type OrbAudioSignal = {
  rms: number;
  energy: number;
  pulse: number;
};

export type OrbAudioSignalState = {
  energy: number;
  pulse: number;
};

export type OrbCallbacks = {
  onPositionChange?: (position: OrbPosition) => void;
  onAudioSignal?: (signal: OrbAudioSignal) => void;
  onStateChange?: (state: OrbState) => void;
  onError?: (error: Error) => void;
};

export type CreateOrbOptions = OrbCallbacks & {
  container: HTMLElement;
  state?: OrbState;
  theme?: BuiltInThemeName | OrbTheme;
  settings?: Partial<OrbSettings>;
  audioSource?: HTMLAudioElement | null;
  audioSignal?: Partial<OrbAudioSignal> | null;
  draggable?: boolean;
  initialPosition?: OrbPosition;
  positionMode?: OrbPositionMode;
  ariaLabel?: string;
};

export type OrbController = {
  setState(state: OrbState): void;
  setTheme(theme: BuiltInThemeName | OrbTheme): void;
  setSettings(settings: Partial<OrbSettings>): void;
  setAudioSource(audioSource: HTMLAudioElement | null): void;
  setAudioSignal(signal: Partial<OrbAudioSignal> | null): void;
  destroy(): void;
};
