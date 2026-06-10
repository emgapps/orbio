# Orb State Visuals Implementation Plan

## Summary

Add visual treatments for existing orb states without changing the public API. The product label "Unavailable" maps to `state="disabled"`, and `state="error"` renders as a red-alert treatment over the current theme.

## Implementation Steps

1. Keep `OrbState` unchanged: `idle`, `speaking`, `error`, and `disabled`.
2. Add a WebGL state mode uniform so the shader can distinguish normal, unavailable, and error rendering.
3. Render `disabled` as an almost black-and-white orb by mixing color toward grayscale and reducing aura/glow intensity.
4. Render `error` by preserving the themed orb while adding a red gradient tint and red-biased aura.
5. Match the same state treatments in the CSS fallback renderer.
6. Add example UI state controls for `Idle`, `Speaking`, `Unavailable`, and `Error`.
7. Cover state mapping, fallback styles, React/core state updates, and example UI state switching in tests.

## Validation

- `pnpm test`
- `pnpm --filter @voca/orb-example-basic typecheck`
- `pnpm --filter @voca/orb-example-basic build`
- `pnpm test:e2e`

## Assumptions

- `disabled` remains the durable API value for the unavailable visual state.
- The example controls are demo/testing controls and do not replace audio-driven state updates.
