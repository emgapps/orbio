import type { OrbAudioSignal, OrbAudioSignalState, OrbSettings } from "../types";

export const emptySignal: OrbAudioSignal = {
  rms: 0,
  energy: 0,
  pulse: 0,
};

export function computeRmsFromTimeDomain(samples: Uint8Array): number {
  if (samples.length === 0) return 0;

  let sum = 0;
  for (const sample of samples) {
    const value = (sample - 128) / 128;
    sum += value * value;
  }

  return Math.sqrt(sum / samples.length);
}

export function nextAudioSignal(
  previous: OrbAudioSignalState,
  rms: number,
  settings: Pick<OrbSettings, "sensitivity">,
): OrbAudioSignal {
  const target = Math.min(1, Math.pow(Math.max(0, rms) * settings.sensitivity * 2.7, 0.85));
  const energy = approach(previous.energy, target, target > previous.energy ? 0.35 : 0.09);
  const pulse = approach(previous.pulse, target, target > previous.pulse ? 0.65 : 0.22);

  return {
    rms,
    energy,
    pulse,
  };
}

function approach(current: number, target: number, factor: number) {
  return current + (target - current) * factor;
}
