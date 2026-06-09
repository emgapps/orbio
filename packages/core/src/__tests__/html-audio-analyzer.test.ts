import { afterEach, describe, expect, it, vi } from "vitest";
import { HtmlAudioAnalyzer } from "../audio/html-audio-analyzer";

class FakeMediaElementSourceNode {
  connect = vi.fn();
  disconnect = vi.fn();
}

class FakeAnalyserNode {
  fftSize = 0;
  smoothingTimeConstant = 0;
  connect = vi.fn();
  disconnect = vi.fn();

  getByteTimeDomainData(data: Uint8Array<ArrayBuffer>) {
    data.fill(128);
    data[0] = 255;
  }
}

describe("HtmlAudioAnalyzer", () => {
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window.webkitAudioContext;

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: originalAudioContext,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      configurable: true,
      value: originalWebkitAudioContext,
    });
  });

  it("reuses a media element source when analyzers switch active orb instances", () => {
    const audio = document.createElement("audio");
    const errors: Error[] = [];
    const mediaSources = new WeakMap<HTMLMediaElement, FakeMediaElementSourceNode>();
    let createMediaElementSourceCalls = 0;

    class FakeAudioContext {
      destination = {};
      state = "running";

      createMediaElementSource(mediaElement: HTMLMediaElement) {
        createMediaElementSourceCalls += 1;

        if (mediaSources.has(mediaElement)) {
          throw new Error("HTMLMediaElement already connected previously to a different MediaElementSourceNode");
        }

        const source = new FakeMediaElementSourceNode();
        mediaSources.set(mediaElement, source);
        return source;
      }

      createAnalyser() {
        return new FakeAnalyserNode();
      }

      resume() {
        return Promise.resolve();
      }
    }

    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(audio, "paused", { configurable: true, value: false });
    Object.defineProperty(audio, "ended", { configurable: true, value: false });

    const first = new HtmlAudioAnalyzer(audio, { onError: (error) => errors.push(error) });
    expect(first.sample({ sensitivity: 1 }).rms).toBeGreaterThan(0);
    first.destroy();

    const second = new HtmlAudioAnalyzer(audio, { onError: (error) => errors.push(error) });
    expect(second.sample({ sensitivity: 1 }).rms).toBeGreaterThan(0);
    second.destroy();

    expect(createMediaElementSourceCalls).toBe(1);
    expect(errors).toEqual([]);
  });
});
