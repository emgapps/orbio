# Orbio

Orbio is an npm library for voice-driven orb UI. The MVP turns the original WebGL speaking-orb prototype into reusable packages with a framework-agnostic core and a React component wrapper.

## Current Status

The repository is being scaffolded from the original single-file demo into the MVP structure described in the project docs.

## Docs

- [High-Level Design](docs/high-level-design.md)
- [MVP Phase Plan](docs/mvp-phase-plan.md)

## MVP Targets

- Draggable orb UI.
- WebGL idle animation.
- Audio-reactive effects from an `HTMLAudioElement`.
- Built-in `default`, `calm`, and `cosmic` themes.
- Runtime settings for size, sensitivity, speed, pulse, glow, and DPR cap.
- React `<Orb />` wrapper over a framework-agnostic core.

## Sample Audio

The original demo voice clip is preserved at `examples/basic/public/avatar.wav` for the MVP example app.
