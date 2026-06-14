# @emgapps/orb-react

React wrapper for Orbio voice-driven orb UI.

## Install

```bash
npm install @emgapps/orb-react
```

## Usage

```tsx
import { Orb, createAudioUrlSession } from "@emgapps/orb-react";
import { useMemo } from "react";

export function VoiceOrb() {
  const session = useMemo(() => createAudioUrlSession("/voice.mp3"), []);

  return (
    <Orb
      audioSource={session.audioSource}
      draggable
      state="idle"
      theme="default"
      settings={{ size: 132 }}
      ariaLabel="Voice assistant orb"
    />
  );
}
```

The component renders WebGL when available and uses a CSS fallback otherwise. It re-exports audio session helpers and public types from `@emgapps/orb-core`. See the repository README for full integration details.

For streamed audio, WebRTC, or custom Web Audio playback where the orb cannot analyze a normal media element, pass a manual signal instead of `audioSource`:

```tsx
<Orb
  audioSignal={{ rms: 0.2, energy: 0.4, pulse: 0.6 }}
  state="speaking"
/>
```

Manual signals override `audioSource` analysis while set. Keep `rms`, `energy`, and `pulse` normalized to `0..1`; pass `audioSignal={null}` or omit it to use the default `audioSource` analyzer.

## License

MIT
