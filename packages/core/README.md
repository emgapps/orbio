# @emgapps/orb-core

Framework-agnostic Orbio core package for voice-driven orb UI.

## Install

```bash
npm install @emgapps/orb-core
```

## Usage

```ts
import { createAudioUrlSession, createOrb } from "@emgapps/orb-core";

const container = document.querySelector<HTMLElement>("#orb")!;
const session = createAudioUrlSession("/voice.mp3");

const orb = createOrb({
  container,
  audioSource: session.audioSource,
  draggable: true,
  state: "idle",
  theme: "default",
});

session.subscribe((event) => {
  if (event.status === "playing") orb.setState("speaking");
  if (event.status === "error") orb.setState("error");
});
```

The package exports renderer, theme, settings, drag, and audio session helpers. See the repository README for full integration details.

For streamed audio, WebRTC, or custom Web Audio playback, you can drive the orb directly:

```ts
orb.setAudioSignal({ rms: 0.2, energy: 0.4, pulse: 0.6 });
orb.setAudioSignal(null); // return to audioSource analysis
```

## License

MIT
