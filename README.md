# Orbio

Orbio is a voice-driven orb UI library. It provides a framework-agnostic core package for rendering, audio analysis, themes, states, and dragging, plus a React wrapper for product UIs.

## Packages

- `@emgapps/orb-core`: core controller, WebGL/CSS fallback renderers, audio sessions, settings, themes, and drag utilities.
- `@emgapps/orb-react`: React `<Orb />` component and re-exported audio session helpers.
- `examples/basic`: local Vite example for exercising themes, audio playback, dragging, and orb states.

## Install

For React apps:

```bash
npm install @emgapps/orb-react
```

For non-React apps:

```bash
npm install @emgapps/orb-core
```

`@emgapps/orb-react` depends on `@emgapps/orb-core`, so React consumers do not need to install both unless they also import core APIs directly.

## React Integration

```tsx
import { Orb, createAudioUrlSession, type OrbState } from "@emgapps/orb-react";
import { useEffect, useMemo, useState } from "react";

export function VoiceOrb() {
  const session = useMemo(() => createAudioUrlSession("/avatar.wav"), []);
  const [state, setState] = useState<OrbState>("idle");

  useEffect(() => {
    return session.subscribe((event) => {
      if (event.status === "playing") setState("speaking");
      if (event.status === "idle" || event.status === "paused" || event.status === "ended") setState("idle");
      if (event.status === "error") setState("error");
    });
  }, [session]);

  useEffect(() => () => session.dispose(), [session]);

  return (
    <Orb
      audioSource={session.audioSource}
      draggable
      state={state}
      theme="default"
      settings={{ size: 132, sensitivity: 0.9 }}
      ariaLabel="Voice assistant orb"
      onPositionChange={(position) => console.log(position)}
      onAudioSignal={(signal) => console.log(signal.energy)}
    />
  );
}
```

No stylesheet import is required. The component mounts a canvas renderer when WebGL is available and falls back to a CSS renderer otherwise.

If your audio is streamed through WebRTC, Web Audio, or another source that is not analyzable as a regular media element, drive the orb with a manual signal:

```tsx
<Orb
  audioSignal={{ rms: 0.2, energy: 0.4, pulse: 0.6 }}
  state="speaking"
/>
```

Set `audioSignal={null}` or omit it to fall back to automatic `audioSource` analysis.

## Core Integration

Use `@emgapps/orb-core` directly when integrating outside React.

```ts
import { createAudioUrlSession, createOrb } from "@emgapps/orb-core";

const container = document.querySelector<HTMLElement>("#orb")!;
const session = createAudioUrlSession("/avatar.wav");

const orb = createOrb({
  container,
  audioSource: session.audioSource,
  draggable: true,
  state: "idle",
  theme: "cosmic",
  settings: { size: 144, pulseStrength: 0.9 },
  onAudioSignal: (signal) => {
    // signal = { rms, energy, pulse }
  },
});

session.subscribe((event) => {
  if (event.status === "playing") orb.setState("speaking");
  if (event.status === "error") orb.setState("error");
});

// Later:
orb.destroy();
session.dispose();
```

## States

`OrbState` is:

```ts
type OrbState = "idle" | "speaking" | "error" | "disabled";
```

- `idle`: animated resting orb.
- `speaking`: audio-reactive orb driven by `HTMLAudioElement` energy.
- `error`: keeps the active theme visible and adds a red alert overlay/glow.
- `disabled`: unavailable state; renders desaturated and almost black-and-white.

In product copy, use "Unavailable" for `state="disabled"` when that is clearer for users.

## Themes And Settings

Built-in themes are `default`, `calm`, and `cosmic`.

```ts
const customTheme = {
  name: "brand",
  colors: {
    bottom: "#23395b",
    middle: "#5f7adb",
    top: "#dce6ff",
    auraA: "#5f7adb",
    auraB: "#dce6ff",
    rim: "#ffffff",
  },
  visual: {
    speed: 0.9,
    pulseStrength: 0.7,
    glowStrength: 0.85,
  },
  states: {
    speaking: { glowStrength: 1.1 },
    disabled: { pulseStrength: 0.2 },
  },
};
```

Runtime settings are `size`, `sensitivity`, `speed`, `pulseStrength`, `glowStrength`, and `dprCap`. Theme `visual` settings and per-state settings are merged first, then runtime `settings` override them.

Theme colors support `#rgb` and `#rrggbb`.

## Audio Sessions

Orbio stays provider-agnostic at the orb boundary: the orb consumes an `HTMLAudioElement`. The helper sessions create or wrap that element and expose lifecycle events.

```ts
import {
  createAudioUrlSession,
  createGoogleCloudTtsSession,
  createHtmlAudioSession,
} from "@emgapps/orb-react";

const urlSession = createAudioUrlSession("/voice.mp3", {
  crossOrigin: "anonymous",
  preload: "auto",
});

const htmlSession = createHtmlAudioSession(existingAudioElement);

const googleTtsSession = createGoogleCloudTtsSession({
  audioContent: response.audioContent,
  audioEncoding: "MP3",
});
```

Always call `session.dispose()` when the audio source is no longer needed. Google Cloud TTS sessions create an object URL and revoke it on dispose.

## Local Development

```bash
pnpm install
pnpm dev
```

Run checks:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
```

## npm Publishing

The repository root and example app stay private. The publishable packages are:

- `packages/core` -> `@emgapps/orb-core`
- `packages/react` -> `@emgapps/orb-react`

Both packages are configured for scoped public publishing with `publishConfig.access = "public"` and package-local README files.

Before publishing:

1. Confirm you have npm publish access to the `@emgapps` scope.
2. Run validation:

```bash
pnpm test
pnpm typecheck
pnpm build
pnpm test:e2e
pnpm pack:packages
```

Publish core first, then React:

```bash
pnpm --filter @emgapps/orb-core publish --access public
pnpm --filter @emgapps/orb-react publish --access public
```

Or use the root helper:

```bash
pnpm publish:packages
```

## Docs

- [High-Level Design](docs/high-level-design.md)
- [MVP Phase Plan](docs/mvp-phase-plan.md)
- [Orb State Visuals Plan](docs/orb-state-visuals-plan.md)

## License

MIT
