import { computeRmsFromTimeDomain, emptySignal, nextAudioSignal } from "./signal";
import type { OrbAudioSignal, OrbCallbacks, OrbSettings } from "../types";

type BrowserAudioContext = AudioContext & {
  createMediaElementSource(mediaElement: HTMLMediaElement): MediaElementAudioSourceNode;
};

type SharedMediaElementSource = {
  audioContext: BrowserAudioContext;
  sourceNode: MediaElementAudioSourceNode;
};

const mediaElementSources = new WeakMap<HTMLAudioElement, SharedMediaElementSource>();

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

export class HtmlAudioAnalyzer {
  private audioSource: HTMLAudioElement | null;
  private analyzer: AnalyserNode | null = null;
  private mediaSource: SharedMediaElementSource | null = null;
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
  }

  private ensureConnected() {
    if (this.analyzer && this.timeData) return;

    const mediaSource = getOrCreateMediaElementSource(this.audioSource!);
    this.mediaSource = mediaSource;
    this.analyzer = mediaSource.audioContext.createAnalyser();
    this.analyzer.fftSize = 1024;
    this.analyzer.smoothingTimeConstant = 0;
    this.timeData = new Uint8Array(this.analyzer.fftSize);

    mediaSource.sourceNode.connect(this.analyzer);
    this.analyzer.connect(mediaSource.audioContext.destination);

    if (mediaSource.audioContext.state === "suspended") {
      void mediaSource.audioContext.resume().catch((error: unknown) => {
        this.callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      });
    }
  }

  private disconnect() {
    if (this.mediaSource && this.analyzer) {
      try {
        this.mediaSource.sourceNode.disconnect(this.analyzer);
      } catch {
        // The browser may already have severed this connection during teardown.
      }
    }

    this.analyzer?.disconnect();
    this.mediaSource = null;
    this.analyzer = null;
    this.timeData = null;
  }
}

function getOrCreateMediaElementSource(audioSource: HTMLAudioElement) {
  const cached = mediaElementSources.get(audioSource);
  if (cached) return cached;

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error("Web Audio is not supported.");
  }

  const audioContext = new AudioContextClass() as BrowserAudioContext;
  const sourceNode = audioContext.createMediaElementSource(audioSource);
  const mediaSource = { audioContext, sourceNode };
  mediaElementSources.set(audioSource, mediaSource);
  return mediaSource;
}
