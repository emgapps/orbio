import { computeRmsFromTimeDomain, emptySignal, nextAudioSignal } from "./signal";
import type { OrbAudioSignal, OrbCallbacks, OrbSettings } from "../types";

type BrowserAudioContext = AudioContext & {
  createMediaElementSource(mediaElement: HTMLMediaElement): MediaElementAudioSourceNode;
};

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class HtmlAudioAnalyzer {
  private audioSource: HTMLAudioElement | null;
  private audioContext: BrowserAudioContext | null = null;
  private analyzer: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private timeData: Uint8Array<ArrayBuffer> | null = null;
  private signal = emptySignal;

  constructor(audioSource: HTMLAudioElement | null, private readonly callbacks: Pick<OrbCallbacks, "onError"> = {}) {
    this.audioSource = audioSource;
  }

  setAudioSource(audioSource: HTMLAudioElement | null) {
    if (this.audioSource === audioSource) return;
    this.disconnect();
    this.audioSource = audioSource;
    this.signal = emptySignal;
  }

  sample(settings: Pick<OrbSettings, "sensitivity">): OrbAudioSignal {
    if (!this.audioSource || this.audioSource.paused || this.audioSource.ended) {
      this.signal = nextAudioSignal(this.signal, 0, settings);
      return this.signal;
    }

    try {
      this.ensureConnected();
      this.analyzer?.getByteTimeDomainData(this.timeData!);
      const rms = computeRmsFromTimeDomain(this.timeData!);
      this.signal = nextAudioSignal(this.signal, rms, settings);
      return this.signal;
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      this.signal = nextAudioSignal(this.signal, 0, settings);
      return this.signal;
    }
  }

  destroy() {
    this.disconnect();
    void this.audioContext?.close();
    this.audioContext = null;
  }

  private ensureConnected() {
    if (this.analyzer && this.timeData) return;

    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio is not supported.");
    }

    this.audioContext = new AudioContextClass() as BrowserAudioContext;
    this.sourceNode = this.audioContext.createMediaElementSource(this.audioSource!);
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 1024;
    this.analyzer.smoothingTimeConstant = 0;
    this.timeData = new Uint8Array(this.analyzer.fftSize);

    this.sourceNode.connect(this.analyzer);
    this.analyzer.connect(this.audioContext.destination);

    if (this.audioContext.state === "suspended") {
      void this.audioContext.resume().catch((error: unknown) => {
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  private disconnect() {
    this.sourceNode?.disconnect();
    this.analyzer?.disconnect();
    this.sourceNode = null;
    this.analyzer = null;
    this.timeData = null;
  }
}
