# Google Cloud TTS Adapter Layer Plan

## Goal

Add a small browser-side adapter layer that turns playable audio sources and Google Cloud TTS REST audio responses into the `HTMLAudioElement` shape already consumed by Orbio.

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

## Boundaries

- The adapter handles complete audio responses, not streaming TTS chunks.
- The existing `Orb` and `createOrb` contracts remain `audioSource?: HTMLAudioElement | null`.
- Speech timing, phonemes, visemes, and provider-specific synthesis options remain outside this adapter layer.

## Validation

- Unit tests cover session lifecycle, playback errors, static URL sessions, base64 decoding, MIME selection, and object URL revocation.
- The example keeps the existing audio playback e2e behavior: one active track at a time, restart on theme switch, speaking state while playing, idle state when paused or ended, and error state on failed playback.
