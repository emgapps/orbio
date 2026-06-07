# Orbio MVP Phase Plan

## Summary

The MVP turns the original single-file speaking-orb demo into an npm library concept probe. It should prove the essential product loop: render a shader orb, drag it around the screen, react to TTS audio energy, expose themes and settings, and validate behavior with red-green tests.

The MVP will use two packages:

- `@voca/orb-core` for renderer, audio analysis, dragging, themes, settings, and state.
- `@voca/orb-react` for a React `<Orb />` wrapper around the core controller.

Gemini TTS remains provider-agnostic in MVP documentation: Gemini audio bytes become a `Blob`, the `Blob` becomes an object URL, and the URL powers an `HTMLAudioElement` passed to the orb.

## Key Implementation Decisions

- Use a pnpm TypeScript workspace with `packages/core`, `packages/react`, and `examples/basic`.
- Use WebGL 1 as the primary renderer, adapted from the existing `index.html` shader.
- Provide a minimal CSS fallback renderer when WebGL is unavailable.
- Support MVP states: `idle`, `speaking`, `error`, and `disabled`.
- Support MVP built-in themes: `default`, `calm`, and `cosmic`.
- Support MVP audio source: `HTMLAudioElement`.
- Support MVP settings: `size`, `sensitivity`, `speed`, `pulseStrength`, `glowStrength`, and `dprCap`.
- Support uncontrolled draggable positioning with viewport clamping.
- Defer position persistence, snap anchors, `MediaStream`, `AudioBuffer`, Web Component wrapper, and custom shader hooks.

## Public API

React API:

```ts
type OrbState = "idle" | "speaking" | "error" | "disabled";
type BuiltInThemeName = "default" | "calm" | "cosmic";
type OrbPosition = { x: number; y: number };

type OrbSettings = {
  size: number;
  sensitivity: number;
  speed: number;
  pulseStrength: number;
  glowStrength: number;
  dprCap: number;
};

type OrbProps = {
  state?: OrbState;
  theme?: BuiltInThemeName | OrbTheme;
  settings?: Partial<OrbSettings>;
  audioSource?: HTMLAudioElement | null;
  draggable?: boolean;
  initialPosition?: OrbPosition;
  className?: string;
  ariaLabel?: string;
  onPositionChange?: (position: OrbPosition) => void;
  onAudioSignal?: (signal: { energy: number; pulse: number; rms: number }) => void;
  onStateChange?: (state: OrbState) => void;
  onError?: (error: Error) => void;
};
```

Core API:

```ts
const orb = createOrb({
  container,
  audioSource,
  theme: "default",
  settings,
  draggable: true,
});

orb.setState("speaking");
orb.setTheme("cosmic");
orb.setSettings({ sensitivity: 1.2 });
orb.setAudioSource(audioElement);
orb.destroy();
```

## Build Plan

1. Scaffold the workspace and package structure.
   - Add root TypeScript, build, and test configuration.
   - Create package exports for ESM and TypeScript declarations.
   - Add the basic example app shell.

2. Extract the core WebGL renderer.
   - Move the shader approach from the demo into `@voca/orb-core`.
   - Expose renderer lifecycle methods for mount, resize, frame rendering, uniform updates, and destroy.
   - Normalize theme colors into shader uniforms.

3. Add audio analysis.
   - Implement lazy `AudioContext` setup for `HTMLAudioElement`.
   - Compute RMS, `energy`, and `pulse`.
   - Keep signal math pure and unit-testable.

4. Add drag behavior.
   - Implement Pointer Events based dragging.
   - Clamp the orb to viewport bounds.
   - Emit `onPositionChange`.

5. Add the React wrapper.
   - Implement `<Orb />` as a thin lifecycle wrapper around `createOrb`.
   - Create browser-only resources after mount for SSR safety.
   - Update the core controller when props change.

6. Add examples and documentation.
   - Build `examples/basic` with theme/settings controls, draggable orb, and `avatar.wav`.
   - Document the Gemini TTS Blob flow.

## Red-Green Test Strategy

Use Vitest for unit and component tests, then Playwright for real-browser smoke tests.

Red phase:

- Write failing tests for default settings merge and runtime settings overrides.
- Write failing tests for built-in theme resolution and custom theme overrides.
- Write failing tests for RMS-to-energy and pulse smoothing.
- Write failing tests for drag clamp math.
- Write failing React tests proving `<Orb />` mounts, updates props, and destroys the controller.
- Write failing Playwright smoke tests proving the example renders a nonblank canvas and dragging changes position.

Green phase:

- Implement the minimum code needed to pass each test group.
- Keep each subsystem independently testable before wiring it into the React example.
- Use browser-only mocks only where jsdom cannot provide WebGL or Web Audio.

Acceptance scenarios:

- `pnpm test` passes Vitest unit and component tests.
- `pnpm test:e2e` passes Playwright smoke tests.
- `pnpm build` emits ESM bundles and `.d.ts` files for both packages.
- The example opens locally and shows a draggable, animated orb.
- Playing `avatar.wav` changes orb energy and pulse visuals.
- Switching themes and settings updates the orb without remounting.

## Assumptions

- Package names are placeholders until final npm scope is chosen.
- MVP optimizes for concept validation over final publishing polish.
- WebGL visual fidelity should stay close to the original demo.
- The initial example audio remains local and checked into `examples/basic/public/avatar.wav`.
