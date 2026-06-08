# Orbio

Orbio is an npm library for voice-driven orb UI. The MVP turns the original WebGL speaking-orb prototype into reusable packages with a framework-agnostic core and a React component wrapper.

## Current Status

The repository now contains the initial MVP scaffold:

- `@voca/orb-core`
- `@voca/orb-react`
- `examples/basic`
- Vitest unit/component coverage
- Playwright browser smoke coverage

## Docs

- [High-Level Design](docs/high-level-design.md)
- [MVP Phase Plan](docs/mvp-phase-plan.md)

## Run Locally

Install dependencies:

```bash
pnpm install
```

Start the basic example:

```bash
pnpm dev
```

Run checks:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

## MVP Targets

- Draggable orb UI.
- WebGL idle animation.
- Audio-reactive effects from an `HTMLAudioElement`.
- Built-in `default`, `calm`, and `cosmic` themes.
- Runtime settings for size, sensitivity, speed, pulse, glow, and DPR cap.
- React `<Orb />` wrapper over a framework-agnostic core.

## Sample Audio

The original demo voice clip is preserved at `examples/basic/public/avatar.wav` for the MVP example app.

## Gemini TTS Audio Flow

Orbio stays provider-agnostic in the MVP. For Gemini or any other TTS provider, convert the returned audio bytes into a browser audio source, then pass the resulting `HTMLAudioElement` to `<Orb />`.

```ts
const audioBlob = new Blob([geminiAudioBytes], { type: "audio/wav" });
const audioUrl = URL.createObjectURL(audioBlob);
const audio = new Audio(audioUrl);

// React example:
<Orb audioSource={audio} state="speaking" />;
```

Revoke object URLs when the audio is no longer needed:

```ts
URL.revokeObjectURL(audioUrl);
```
