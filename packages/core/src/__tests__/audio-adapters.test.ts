import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createAudioUrlSession,
  createGoogleCloudTtsSession,
  createHtmlAudioSession,
  type AudioSessionEvent,
  type AudioSessionStatus,
  type GoogleCloudTtsAudioEncoding,
} from "../audio/adapters";

const originalCreateObjectURL = URL.createObjectURL;
const originalRevokeObjectURL = URL.revokeObjectURL;

describe("audio session adapters", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      value: originalCreateObjectURL,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      value: originalRevokeObjectURL,
    });
  });

  it("wraps an existing audio element with playback lifecycle controls", async () => {
    const audio = document.createElement("audio");
    const play = vi.spyOn(audio, "play").mockResolvedValue(undefined);
    const pause = vi.spyOn(audio, "pause").mockImplementation(() => undefined);
    const session = createHtmlAudioSession(audio);
    const events: AudioSessionStatus[] = [];
    const unsubscribe = session.subscribe((event) => events.push(event.status));

    audio.currentTime = 4;
    await session.play({ restart: true });

    expect(audio.currentTime).toBe(0);
    expect(play).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["playing"]);

    audio.currentTime = 2;
    session.pause();
    expect(pause).toHaveBeenCalled();
    expect(events[events.length - 1]).toBe("paused");

    session.pause({ reset: true });
    expect(audio.currentTime).toBe(0);
    expect(events[events.length - 1]).toBe("idle");

    audio.dispatchEvent(new Event("ended"));
    expect(events[events.length - 1]).toBe("ended");

    unsubscribe();
    audio.dispatchEvent(new Event("play"));
    expect(events[events.length - 1]).toBe("ended");

    session.dispose();
    audio.dispatchEvent(new Event("error"));
    expect(events[events.length - 1]).toBe("ended");
  });

  it("emits and rethrows playback errors", async () => {
    const audio = document.createElement("audio");
    const playbackError = new Error("Autoplay blocked");
    vi.spyOn(audio, "play").mockRejectedValue(playbackError);
    vi.spyOn(audio, "pause").mockImplementation(() => undefined);

    const session = createHtmlAudioSession(audio);
    const events: AudioSessionEvent[] = [];
    session.subscribe((event) => events.push(event));

    await expect(session.play()).rejects.toThrow("Autoplay blocked");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      status: "error",
      audioSource: audio,
      error: playbackError,
    });
  });

  it("creates sessions for static audio URLs and applies element options", () => {
    const session = createAudioUrlSession("/voice.mp3", {
      crossOrigin: "anonymous",
      muted: true,
      preload: "auto",
      volume: 0.5,
    });

    expect(session.audioSource.src).toContain("/voice.mp3");
    expect(session.audioSource.crossOrigin).toBe("anonymous");
    expect(session.audioSource.muted).toBe(true);
    expect(session.audioSource.preload).toBe("auto");
    expect(session.audioSource.volume).toBe(0.5);
  });

  it("decodes Google Cloud TTS base64 audio and defaults to MP3", async () => {
    const { createObjectURL, revokeObjectURL } = mockObjectUrlApis(["blob:google-tts"]);

    const session = createGoogleCloudTtsSession({
      audioContent: btoa("hello audio"),
    });

    const blob = createObjectURL.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("audio/mpeg");
    await expect(readBlobText(blob)).resolves.toBe("hello audio");
    expect(session.audioSource.src).toBe("blob:google-tts");

    session.dispose();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:google-tts");
  });

  it("maps Google Cloud TTS encodings to browser MIME types", () => {
    const { createObjectURL } = mockObjectUrlApis([
      "blob:linear16",
      "blob:mulaw",
      "blob:alaw",
      "blob:ogg",
      "blob:custom",
    ]);
    const cases: Array<[GoogleCloudTtsAudioEncoding, string]> = [
      ["LINEAR16", "audio/wav"],
      ["MULAW", "audio/wav"],
      ["ALAW", "audio/wav"],
      ["OGG_OPUS", "audio/ogg"],
    ];

    for (const [audioEncoding, expectedMimeType] of cases) {
      const session = createGoogleCloudTtsSession({
        audioContent: btoa("audio"),
        audioEncoding,
      });
      const blob = createObjectURL.mock.calls[createObjectURL.mock.calls.length - 1]?.[0] as Blob;
      expect(blob.type).toBe(expectedMimeType);
      session.dispose();
    }

    const customMimeSession = createGoogleCloudTtsSession({
      audioContent: btoa("audio"),
      audioEncoding: "MP3",
      mimeType: "audio/custom",
    });
    const customBlob = createObjectURL.mock.calls[createObjectURL.mock.calls.length - 1]?.[0] as Blob;
    expect(customBlob.type).toBe("audio/custom");
    customMimeSession.dispose();
  });
});

function mockObjectUrlApis(urls: string[]) {
  const remainingUrls = [...urls];
  const createObjectURL = vi.fn(() => remainingUrls.shift() ?? "blob:test-audio");
  const revokeObjectURL = vi.fn();

  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: createObjectURL,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: revokeObjectURL,
  });

  return { createObjectURL, revokeObjectURL };
}

function readBlobText(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error ?? new Error("Failed to read blob.")));
    reader.readAsText(blob);
  });
}
