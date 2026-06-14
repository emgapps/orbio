# Google Cloud TTS Adapter Layer Plan

## Goal

Add a small browser-side adapter layer that turns playable audio sources and Google Cloud TTS REST audio responses into the `HTMLAudioElement` shape consumed by Orbio's automatic analyzer.

## Public API

The adapter layer lives in `@emgapps/orb-core` and is re-exported from `@emgapps/orb-react` for React apps.

```ts
type AudioSessionStatus = "idle" | "playing" | "paused" | "ended" | "error";

type AudioSession = {
  audioSource: HTMLAudioElement;
  play(options?: { restart?: boolean }): Promise<void>;
  pause(options?: { reset?: boolean }): void;
  reset(): void;
  dispose(): void;
  subscribe(listener: (event: AudioSessionEvent) => void): () => void;
};
```

Session factories:

- `createHtmlAudioSession(audioSource, options)` wraps an existing `HTMLAudioElement`.
- `createAudioUrlSession(src, options)` creates a session for source-file URLs and playable remote URLs.
- `createGoogleCloudTtsSession(input, options)` converts a backend-returned Google Cloud TTS `audioContent` string into a playable session.

## Google Cloud TTS Flow

Google Cloud credentials and synthesis calls stay outside Orbio. The expected browser input is the REST response shape returned by an application backend:

```ts
const session = createGoogleCloudTtsSession({
  audioContent: response.audioContent,
  audioEncoding: "MP3",
});

orb.setAudioSource(session.audioSource);
await session.play({ restart: true });
```

Defaults and encoding behavior:

- Default `audioEncoding` is `MP3`.
- Default MIME type is `audio/mpeg`.
- `LINEAR16`, `MULAW`, and `ALAW` map to `audio/wav`.
- `OGG_OPUS` maps to `audio/ogg`.
- `mimeType` can override the adapter's inferred MIME type.
- `dispose()` revokes the object URL created for decoded TTS audio.

## Source File Flow

Static files and app-hosted audio URLs use the same session contract:

```ts
const session = createAudioUrlSession("/avatar.wav", { preload: "auto" });

orb.setAudioSource(session.audioSource);
await session.play();
```

The basic example wraps its existing hidden `<audio>` nodes with `createHtmlAudioSession(...)` so Playwright-visible audio elements stay stable while playback logic moves into the shared adapter.

## Manual Signal Flow

Streams, WebRTC playback, custom Web Audio graphs, or chunked TTS flows do not need an audio session if the application already owns playback and analysis. Those integrations can bypass `audioSource` and drive the orb with normalized signal values:

```ts
orb.setAudioSignal({ rms: 0.2, energy: 0.4, pulse: 0.6 });
orb.setAudioSignal(null); // return to audioSource analysis
```

In React, pass the same values through `<Orb audioSignal={...} />`. While set, the manual signal overrides `audioSource` analysis.

## Boundaries

- The adapter handles complete audio responses, not streaming TTS chunks.
- `audioSource?: HTMLAudioElement | null` remains the automatic-analysis contract for session-backed playback.
- `audioSignal?: Partial<OrbAudioSignal> | null` is the supported override for sources that cannot use the built-in `HTMLAudioElement` analyzer.
- Speech timing, phonemes, visemes, and provider-specific synthesis options remain outside this adapter layer.

## Validation

- Unit tests cover session lifecycle, playback errors, static URL sessions, base64 decoding, MIME selection, and object URL revocation.
- The example keeps the existing audio playback e2e behavior: one active track at a time, restart on theme switch, speaking state while playing, idle state when paused or ended, and error state on failed playback.
