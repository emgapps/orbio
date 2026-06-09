# Three-Orb Theme Carousel Implementation Plan

## Goal

Update the basic example so the Theme panel supports a pinned three-orb carousel and an unpinned single draggable active orb with per-theme settings, signal, and position state.

## Feasibility Finding

The current React wrapper can render three independent orbs. Each `<Orb />` instance creates its own core controller, renderer, drag controller, audio analyzer, and animation frame. No changes are required in `@voca/orb-core` or `@voca/orb-react`.

One implementation detail matters for audio: the browser only allows one `MediaElementAudioSourceNode` per HTML media element, so the example should pass the shared audio element only to the active orb.

## Implementation Phases

1. Refactor example state in `examples/basic/src/main.tsx`.
   - Replace single `theme`, `settings`, `signal`, and `position` state with per-theme records keyed by `default`, `calm`, and `cosmic`.
   - Add `activeTheme`, `isPinned`, and per-theme remembered floating positions.
   - Make Graphic Settings, Signal, and Position read/write only the active theme.

2. Build pinned carousel behavior.
   - Render all three built-in themes in pinned mode.
   - Center the active orb and place the other two left/right in the Theme panel.
   - Add previous/next buttons, wheel navigation, and side-orb click navigation.
   - Hide the theme selector while pinned.
   - Show an `Unpin` button at the top of the Theme panel.

3. Build unpinned floating behavior.
   - On `Unpin`, render only the active orb, enable dragging, show the theme selector, and change the button to `Pin`.
   - Theme selector switches to another saved orb and its settings.
   - Remember dragged positions per theme without feeding live drag coordinates back into `initialPosition`.
   - On `Pin`, restore the three-orb carousel and hide the selector.

4. Update styles and tests.
   - Update `examples/basic/src/styles.css` for the carousel stage, controls, active/inactive orb treatment, and responsive layout.
   - Update `tests/e2e/basic.spec.ts` for three initial orbs, carousel navigation, scoped settings, unpin drag, selector switching, and pin restoration.

## Validation

- Run `pnpm --filter @voca/orb-example-basic typecheck`.
- Run `pnpm --filter @voca/orb-example-basic build`.
- Run `pnpm test:e2e`.
- Manually verify the pinned carousel and unpinned dragging in the browser.

## Assumptions

- The carousel uses the existing built-in themes: `default`, `calm`, and `cosmic`.
- While unpinned, the visible theme selector switches to another saved orb rather than retheming the current one.
- Each theme remembers its own floating position between unpin/pin cycles.
- No changes are needed to `@voca/orb-core` or `@voca/orb-react`.
