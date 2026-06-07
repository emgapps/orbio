import { describe, expect, it } from "vitest";
import { computeRmsFromTimeDomain, nextAudioSignal } from "../audio/signal";

describe("audio signal math", () => {
  it("computes zero RMS for centered silence", () => {
    expect(computeRmsFromTimeDomain(new Uint8Array([128, 128, 128, 128]))).toBe(0);
  });

  it("computes RMS from Web Audio time-domain samples", () => {
    const rms = computeRmsFromTimeDomain(new Uint8Array([0, 128, 255]));

    expect(rms).toBeGreaterThan(0.8);
    expect(rms).toBeLessThan(0.9);
  });

  it("uses faster attack for pulse than energy", () => {
    const signal = nextAudioSignal({ energy: 0, pulse: 0 }, 0.4, { sensitivity: 1 });

    expect(signal.pulse).toBeGreaterThan(signal.energy);
    expect(signal.energy).toBeGreaterThan(0);
  });

  it("releases signal gradually when audio drops", () => {
    const signal = nextAudioSignal({ energy: 1, pulse: 1 }, 0, { sensitivity: 1 });

    expect(signal.energy).toBeGreaterThan(signal.pulse);
    expect(signal.energy).toBeLessThan(1);
  });
});
