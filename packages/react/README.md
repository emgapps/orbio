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

## License

MIT
