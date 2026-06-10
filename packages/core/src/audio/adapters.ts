export type AudioSessionStatus = "idle" | "playing" | "paused" | "ended" | "error";

export type AudioSessionEvent = {
  status: AudioSessionStatus;
  audioSource: HTMLAudioElement;
  error?: Error;
};

export type AudioSessionListener = (event: AudioSessionEvent) => void;

export type AudioSessionPlayOptions = {
  restart?: boolean;
};

export type AudioSessionPauseOptions = {
  reset?: boolean;
};

export type AudioSessionElementOptions = {
  preload?: HTMLAudioElement["preload"];
  crossOrigin?: HTMLAudioElement["crossOrigin"];
  loop?: boolean;
  muted?: boolean;
  volume?: number;
};

export type AudioSession = {
  audioSource: HTMLAudioElement;
  play(options?: AudioSessionPlayOptions): Promise<void>;
  pause(options?: AudioSessionPauseOptions): void;
  reset(): void;
  dispose(): void;
  subscribe(listener: AudioSessionListener): () => void;
};

export type GoogleCloudTtsAudioEncoding = "MP3" | "LINEAR16" | "MULAW" | "ALAW" | "OGG_OPUS";

export type GoogleCloudTtsSessionInput = {
  audioContent: string;
  audioEncoding?: GoogleCloudTtsAudioEncoding;
  mimeType?: string;
};

type InternalAudioSessionOptions = AudioSessionElementOptions & {
  onDispose?: () => void;
};

const googleCloudTtsMimeTypes: Record<GoogleCloudTtsAudioEncoding, string> = {
  MP3: "audio/mpeg",
  LINEAR16: "audio/wav",
  MULAW: "audio/wav",
  ALAW: "audio/wav",
  OGG_OPUS: "audio/ogg",
};

export function createHtmlAudioSession(
  audioSource: HTMLAudioElement,
  options: AudioSessionElementOptions = {},
): AudioSession {
  return createAudioSession(audioSource, options);
}

export function createAudioUrlSession(src: string, options: AudioSessionElementOptions = {}): AudioSession {
  const audioSource = new Audio();
  applyAudioElementOptions(audioSource, options);
  audioSource.src = src;

  return createAudioSession(audioSource);
}

export function createGoogleCloudTtsSession(
  input: GoogleCloudTtsSessionInput,
  options: AudioSessionElementOptions = {},
): AudioSession {
  const mimeType = input.mimeType ?? googleCloudTtsMimeTypes[input.audioEncoding ?? "MP3"];
  const audioBytes = decodeBase64AudioContent(input.audioContent);
  const audioBlob = new Blob([audioBytes], { type: mimeType });
  const audioUrl = URL.createObjectURL(audioBlob);

  const audioSource = new Audio();
  applyAudioElementOptions(audioSource, options);
  audioSource.src = audioUrl;

  return createAudioSession(audioSource, {
    onDispose: () => URL.revokeObjectURL(audioUrl),
  });
}

function createAudioSession(
  audioSource: HTMLAudioElement,
  options: InternalAudioSessionOptions = {},
): AudioSession {
  applyAudioElementOptions(audioSource, options);

  let status: AudioSessionStatus = getInitialStatus(audioSource);
  let disposed = false;
  let lastError: Error | undefined;
  const listeners = new Set<AudioSessionListener>();

  const notify = (nextStatus: AudioSessionStatus, error?: Error) => {
    if (disposed) return;
    if (status === nextStatus && error === lastError) return;

    status = nextStatus;
    lastError = error;
    const event = { status, audioSource, error };
    for (const listener of listeners) listener(event);
  };

  const handlePlay = () => notify("playing");
  const handlePause = () => notify(audioSource.currentTime === 0 ? "idle" : "paused");
  const handleEnded = () => notify("ended");
  const handleError = () => notify("error", getMediaError(audioSource));

  audioSource.addEventListener("play", handlePlay);
  audioSource.addEventListener("pause", handlePause);
  audioSource.addEventListener("ended", handleEnded);
  audioSource.addEventListener("error", handleError);

  return {
    audioSource,
    async play(playOptions = {}) {
      if (playOptions.restart) restartAudio(audioSource, notify);

      try {
        await audioSource.play();
        notify("playing");
      } catch (error) {
        const normalizedError = toError(error);
        notify("error", normalizedError);
        throw normalizedError;
      }
    },
    pause(pauseOptions = {}) {
      audioSource.pause();

      if (pauseOptions.reset) {
        resetAudio(audioSource, notify);
        notify("idle");
        return;
      }

      notify(audioSource.currentTime === 0 ? "idle" : "paused");
    },
    reset() {
      resetAudio(audioSource, notify);
      if (audioSource.paused || audioSource.ended) notify("idle");
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      listeners.clear();
      audioSource.removeEventListener("play", handlePlay);
      audioSource.removeEventListener("pause", handlePause);
      audioSource.removeEventListener("ended", handleEnded);
      audioSource.removeEventListener("error", handleError);
      audioSource.pause();
      options.onDispose?.();
    },
    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

function applyAudioElementOptions(audioSource: HTMLAudioElement, options: AudioSessionElementOptions) {
  if (options.preload !== undefined) audioSource.preload = options.preload;
  if (options.crossOrigin !== undefined) audioSource.crossOrigin = options.crossOrigin;
  if (options.loop !== undefined) audioSource.loop = options.loop;
  if (options.muted !== undefined) audioSource.muted = options.muted;
  if (options.volume !== undefined) audioSource.volume = options.volume;
}

function getInitialStatus(audioSource: HTMLAudioElement): AudioSessionStatus {
  if (audioSource.ended) return "ended";
  if (!audioSource.paused) return "playing";
  return audioSource.currentTime === 0 ? "idle" : "paused";
}

function resetAudio(
  audioSource: HTMLAudioElement,
  notify: (status: AudioSessionStatus, error?: Error) => void,
) {
  try {
    audioSource.currentTime = 0;
  } catch (error) {
    notify("error", toError(error));
  }
}

function restartAudio(
  audioSource: HTMLAudioElement,
  notify: (status: AudioSessionStatus, error?: Error) => void,
) {
  try {
    audioSource.pause();
  } catch (error) {
    notify("error", toError(error));
  }

  resetAudio(audioSource, notify);

  try {
    audioSource.load();
  } catch (error) {
    notify("error", toError(error));
  }
}

function getMediaError(audioSource: HTMLAudioElement) {
  const mediaError = audioSource.error;
  if (!mediaError) return new Error("Audio playback failed.");

  return new Error(`Audio playback failed with media error code ${mediaError.code}.`);
}

function toError(error: unknown) {
  return error instanceof Error ? error : new Error(String(error));
}

function decodeBase64AudioContent(audioContent: string) {
  const binary = atob(audioContent.replace(/\s/g, ""));
  const audioBytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    audioBytes[index] = binary.charCodeAt(index);
  }

  return audioBytes;
}
