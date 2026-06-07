# Voca Orb NPM Library - High-Level Design

## 1. Goal

Build an npm library that turns the current speaking orb demo into a reusable, customizable UI component for voice-driven web experiences. The library should provide a draggable orb, shader-based idle animation, audio-reactive speaking effects, theme customization, and runtime controls for visual behavior.

## 2. Current Example Baseline

The existing `index.html` demo proves the core visual and audio behavior:

- A WebGL fragment shader renders a soft gradient orb with continuous idle motion.
- Web Audio routes an `<audio>` element through an `AnalyserNode`.
- Per-frame RMS energy is computed from time-domain audio data.
- Smoothed energy and pulse values drive shader uniforms for glow, shimmer, swell, and speaking state.
- Playback is controlled by clicking the orb, a center button, or pressing Space.

The npm library should preserve this model, but separate rendering, audio analysis, state, themes, and framework bindings into reusable modules.

## 3. Target Users

- Product teams adding a voice assistant, agent, avatar, or TTS playback UI.
- Developers using Gemini TTS or other text-to-speech providers.
- React app developers who want a polished drop-in component.
- Advanced users who want lower-level access to the renderer and audio analyzer.

## 4. Functional Requirements

### 4.1 Movable UI Orb

- Render an orb above normal app UI.
- Allow pointer dragging across desktop and touch devices.
- Support configurable initial position.
- Support optional position persistence through `localStorage` or a consumer-provided storage adapter.
- Support optional snapping to screen edges or fixed anchors.
- Keep the orb inside the viewport unless explicitly configured otherwise.
- Expose position change events.

### 4.2 Shader-Based Idle Animation

- Render a continuous idle animation when no audio is active.
- Use WebGL shaders as the primary renderer.
- Keep the orb visually alive through breathing, drifting noise, gradient motion, and soft glow.
- Allow idle speed, motion intensity, and color palette to be configured.
- Respect reduced-motion preferences by lowering animation intensity.

### 4.3 Audio-Reactive Effects

- Sync the orb with TTS audio, including Gemini-generated speech audio.
- Support audio input from:
  - `HTMLAudioElement`
  - `HTMLVideoElement`
  - `MediaStream`
  - `AudioBuffer`
  - Consumer-provided external energy values
- Analyze audio amplitude using Web Audio.
- Derive at least two normalized signals:
  - `energy`: smoothed loudness, good for glow and scale.
  - `pulse`: faster transient response, good for shimmer and ripple accents.
- Allow sensitivity, attack, release, smoothing, and gain configuration.
- Provide fallback behavior when Web Audio is unavailable or blocked by browser autoplay policies.

### 4.4 Themes

- Provide built-in themes:
  - `default`
  - `calm`
  - `neon`
  - `cosmic`
  - `minimal`
  - `assistant`
- Allow fully custom themes.
- Theme fields should include:
  - Base colors
  - Gradient stops
  - Aura colors
  - Glow intensity
  - Rim light intensity
  - Shader preset
  - Idle state overrides
  - Speaking state overrides
  - Optional CSS variables for wrapper UI

### 4.5 Graphic Settings

- Expose runtime settings for:
  - Orb size
  - Audio sensitivity
  - Animation speed
  - Idle drift strength
  - Breathing strength
  - Pulse strength
  - Glow strength
  - Distortion strength
  - Audio smoothing
  - Device pixel ratio cap
  - Performance mode
- Allow settings to be updated dynamically without remounting the orb.

### 4.6 Orb States

The library should support explicit states beyond raw playback:

- `idle`
- `listening`
- `thinking`
- `speaking`
- `error`
- `disabled`

Each state can map to different shader uniforms, theme overrides, accessibility labels, and optional UI affordances.

## 5. Non-Goals For V1

- No direct Gemini API client inside the orb package.
- No server-side TTS generation.
- No 3D engine dependency unless a future renderer needs it.
- No required global state library.
- No mandatory app shell, chat UI, or assistant workflow.
- No hard dependency on React in the core renderer.

Gemini integration should be documented as an example that converts generated audio into a playable source, then passes that source to the orb.

## 6. Proposed Architecture

Use a small framework-agnostic core with a React wrapper on top.

```text
Application
  |
  | uses
  v
React Orb Component
  |
  | wraps
  v
Core Orb Controller
  |
  | coordinates
  +-- WebGL Renderer
  +-- Audio Analyzer
  +-- Drag Controller
  +-- Theme Resolver
  +-- State Machine
```

### 6.1 Core Package

The core package owns non-React behavior:

- Canvas creation and lifecycle hooks.
- WebGL shader compilation and uniform updates.
- Audio analysis and signal smoothing.
- Drag position calculations.
- Theme normalization.
- State transitions.
- Event dispatch.

### 6.2 React Package

The React package owns integration ergonomics:

- `<Orb />` component.
- Props-to-controller lifecycle.
- Refs for imperative control.
- SSR-safe mounting.
- React event callbacks.

## 7. Public API Draft

### 7.1 React Component

```tsx
import { Orb } from "@voca/orb-react";

export function AssistantOrb({ audioElement }: { audioElement: HTMLAudioElement | null }) {
  return (
    <Orb
      state="speaking"
      theme="cosmic"
      audioSource={audioElement}
      draggable
      initialPosition={{ x: 24, y: 24 }}
      settings={{
        size: 96,
        sensitivity: 0.8,
        speed: 1.2,
        pulseStrength: 0.7,
        glowStrength: 0.9,
      }}
      onPositionChange={(position) => console.log(position)}
    />
  );
}
```

### 7.2 Core Controller

```ts
import { createOrb } from "@voca/orb-core";

const orb = createOrb({
  container: document.querySelector("#orb-root")!,
  audioSource: audioElement,
  theme: "assistant",
  draggable: true,
});

orb.setState("speaking");
orb.setSettings({ sensitivity: 1.1 });
orb.setTheme("neon");
orb.destroy();
```

### 7.3 Suggested Props

```ts
type OrbProps = {
  state?: OrbState;
  theme?: BuiltInThemeName | OrbTheme;
  settings?: Partial<OrbSettings>;
  audioSource?: OrbAudioSource;
  draggable?: boolean | DragOptions;
  initialPosition?: OrbPosition;
  persistPosition?: boolean | PositionPersistenceOptions;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
  onDragStart?: (position: OrbPosition) => void;
  onDragEnd?: (position: OrbPosition) => void;
  onPositionChange?: (position: OrbPosition) => void;
  onAudioSignal?: (signal: OrbAudioSignal) => void;
  onStateChange?: (state: OrbState) => void;
  onError?: (error: OrbError) => void;
};
```

## 8. Audio Pipeline

### 8.1 Input Flow

```text
Gemini TTS bytes or URL
  -> Blob or audio URL
  -> HTMLAudioElement or AudioBuffer
  -> Orb audioSource
  -> Web Audio AnalyserNode
  -> energy and pulse signals
  -> shader uniforms
```

### 8.2 Signal Strategy

- Compute RMS from time-domain audio data for stable speech dynamics.
- Apply configurable gain and sensitivity.
- Use fast attack and slow release for `energy`.
- Use faster attack and release for `pulse`.
- Clamp output signals to `0..1`.
- Optionally expose raw RMS for advanced consumers.

### 8.3 Browser Constraints

- AudioContext creation should be lazy and usually triggered by user interaction.
- Autoplay failures should surface through `onError`.
- If the audio source cannot be connected to Web Audio, allow manual signal input:

```ts
orb.setAudioSignal({ energy: 0.42, pulse: 0.7 });
```

## 9. Renderer Design

### 9.1 WebGL Renderer

The first renderer should be a WebGL 1 renderer derived from the current example.

Responsibilities:

- Compile vertex and fragment shaders.
- Manage canvas resize and device pixel ratio.
- Update uniforms every animation frame.
- Render transparent canvas output.
- Pause or reduce work when hidden.
- Clean up buffers, shaders, programs, and listeners on destroy.

### 9.2 Shader Uniforms

Initial uniforms:

```ts
type OrbUniforms = {
  resolution: [number, number];
  time: number;
  energy: number;
  pulse: number;
  speed: number;
  colors: OrbShaderColors;
  glowStrength: number;
  distortionStrength: number;
  idleDriftStrength: number;
  breathingStrength: number;
};
```

### 9.3 Fallback Renderer

V1 should provide a graceful fallback when WebGL is unavailable:

- CSS radial-gradient orb.
- Basic transform and opacity animation.
- Audio-reactive scale and shadow using `energy`.

This fallback does not need to match shader fidelity, but it should preserve basic product usability.

## 10. Drag And Positioning

The drag controller should be independent of React and renderer internals.

Requirements:

- Use Pointer Events.
- Support mouse, touch, and stylus.
- Avoid selecting page text while dragging.
- Clamp to viewport by default.
- Recalculate bounds on resize.
- Expose controlled and uncontrolled position modes.

Suggested position API:

```ts
type OrbPosition =
  | { x: number; y: number }
  | { anchor: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center" };
```

## 11. Theme System

Themes should be resolved into a normalized runtime object before they reach the renderer.

```ts
type OrbTheme = {
  name?: string;
  colors: {
    bottom: string;
    middle: string;
    top: string;
    auraA?: string;
    auraB?: string;
    rim?: string;
  };
  visual?: Partial<OrbSettings>;
  states?: Partial<Record<OrbState, Partial<OrbSettings>>>;
};
```

Theme resolution order:

1. Built-in defaults.
2. Built-in theme.
3. Custom theme overrides.
4. State-specific overrides.
5. Runtime settings prop.

## 12. State Machine

The orb state should be explicit and predictable.

```text
idle
  -> listening
  -> thinking
  -> speaking
  -> idle

any state
  -> error
  -> idle

any state
  -> disabled
```

Consumers may either control state directly or let the audio source drive `speaking` automatically.

## 13. Accessibility

- Canvas should have an accessible wrapper role when interactive.
- `ariaLabel` should default to a useful label such as "Voice assistant orb".
- Drag handle behavior should be reachable by keyboard in a future minor release.
- Respect `prefers-reduced-motion`.
- Avoid rapidly flashing visual states.
- Provide `disabled` state semantics.
- Ensure controls layered over the orb remain focusable and visible.

## 14. Performance Requirements

- Use `requestAnimationFrame`.
- Cap device pixel ratio, defaulting to `2`.
- Avoid layout reads in the render loop.
- Pause or throttle rendering when document visibility is hidden.
- Use `ResizeObserver` for canvas sizing.
- Avoid allocating arrays every frame.
- Provide a `performanceMode` setting:
  - `quality`
  - `balanced`
  - `battery`

## 15. Package Structure Proposal

```text
packages/
  core/
    src/
      audio/
      drag/
      renderer/
      state/
      themes/
      types.ts
  react/
    src/
      Orb.tsx
      useOrbController.ts
examples/
  basic/
  gemini-tts/
  themes/
docs/
  high-level-design.md
```

For the current small repo, this structure can be introduced gradually. The first implementation can start with `src/` and split into packages when publishing setup is added.

## 16. MVP Scope

V1 should ship the smallest complete library:

- React `<Orb />` component.
- Core WebGL renderer extracted from the existing demo.
- Draggable orb with viewport clamping.
- Audio analysis for `HTMLAudioElement`.
- `idle` and `speaking` states.
- Three built-in themes: `default`, `calm`, and `cosmic`.
- Runtime settings for size, sensitivity, speed, pulse, glow, and DPR cap.
- Basic docs and one local example.

## 17. Later Enhancements

- Vanilla JS and Web Component wrappers.
- MediaStream and AudioBuffer support.
- Snap-to-edge and magnetic anchors.
- Theme editor playground.
- More shader presets.
- Controlled position mode.
- Keyboard drag support.
- Manual external audio signal mode.
- Storybook or Ladle visual examples.
- Automated screenshot regression checks.

## 18. Validation Plan

Implementation should be validated through:

- Unit tests for theme resolution, settings merging, audio smoothing, and drag math.
- Browser tests for dragging, viewport clamping, and audio state changes.
- Visual smoke tests confirming the canvas is nonblank.
- Manual checks in Chrome, Safari, and Firefox.
- Reduced-motion check.
- WebGL fallback check.
- Package build check for ESM and TypeScript declarations.

## 19. Risks And Mitigations

- Browser autoplay restrictions can block audio analysis.
  - Mitigation: lazy AudioContext creation and clear error callbacks.
- WebGL support may be unavailable on some devices.
  - Mitigation: provide CSS fallback renderer.
- Shader customization can become too broad.
  - Mitigation: expose themes and settings first, then add custom shader hooks later.
- React-only design may limit adoption.
  - Mitigation: keep renderer and controller framework-agnostic.
- Dragging can conflict with app gestures on mobile.
  - Mitigation: use Pointer Events, `touch-action`, and configurable drag handles.

## 20. Open Questions

- What package name and npm scope should be used?
- Should V1 be React-only publicly, even if the internals are framework-agnostic?
- Should the orb include a built-in play/pause button, or should controls be consumer-owned?
- Should position persistence be enabled by default?
- Should Gemini examples use raw audio bytes, a Blob URL, or a prebuilt audio element?
- Is the visual target closer to the current ElevenLabs-style demo or more brandable assistant avatars?

