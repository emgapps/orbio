import { HtmlAudioAnalyzer } from "./audio/html-audio-analyzer";
import { emptySignal } from "./audio/signal";
import { createDragController, type DragController } from "./drag/controller";
import { createRenderer } from "./renderer";
import type { OrbRenderer } from "./renderer/types";
import { resolveSettings } from "./settings";
import { getThemeSettings, resolveTheme } from "./themes";
import type {
  BuiltInThemeName,
  CreateOrbOptions,
  OrbAudioSignal,
  OrbController,
  OrbSettings,
  OrbState,
  OrbTheme,
  ResolvedOrbTheme,
} from "./types";

const defaultPosition = { x: 24, y: 24 };

export function createOrb(options: CreateOrbOptions): OrbController {
  const container = options.container;
  let state: OrbState = options.state ?? "idle";
  let themeInput: BuiltInThemeName | OrbTheme = options.theme ?? "default";
  let theme = resolveTheme(themeInput);
  let settingsOverride = options.settings ?? {};
  let settings = resolveEffectiveSettings(theme, state, settingsOverride);
  let manualSignal: Partial<OrbAudioSignal> | null = null;
  let frameId = 0;
  let startTime: number | null = null;

  prepareContainer(container, settings, state, options.ariaLabel, options.positionMode);

  const renderer = createRenderer(settings, theme, options);
  container.replaceChildren(renderer.element);

  const analyzer = new HtmlAudioAnalyzer(options.audioSource ?? null, options);
  let drag: DragController | null = createDragController({
    element: container,
    initialPosition: options.initialPosition ?? defaultPosition,
    enabled: options.draggable ?? false,
    onPositionChange: options.onPositionChange,
    getSize: () => ({ width: settings.size, height: settings.size }),
    getViewport: () => ({ width: window.innerWidth, height: window.innerHeight }),
  });
  drag.setEnabled(options.draggable ?? false);

  const render = (timestamp: number) => {
    if (startTime === null) startTime = timestamp;
    const time = (timestamp - startTime) / 1000;
    const signal = getSignal();

    options.onAudioSignal?.(signal);
    renderer.render({ time, signal, settings, theme, state });
    frameId = window.requestAnimationFrame(render);
  };

  frameId = window.requestAnimationFrame(render);

  return {
    setState(nextState) {
      if (state === nextState) return;
      state = nextState;
      settings = resolveEffectiveSettings(theme, state, settingsOverride);
      prepareContainer(container, settings, state, options.ariaLabel, options.positionMode);
      renderer.resize(settings);
      drag?.setPosition(drag.getPosition());
      options.onStateChange?.(state);
    },
    setTheme(nextTheme) {
      themeInput = nextTheme;
      theme = resolveTheme(themeInput);
      settings = resolveEffectiveSettings(theme, state, settingsOverride);
      prepareContainer(container, settings, state, options.ariaLabel, options.positionMode);
      renderer.resize(settings);
      drag?.setPosition(drag.getPosition());
    },
    setSettings(nextSettings) {
      settingsOverride = {
        ...settingsOverride,
        ...nextSettings,
      };
      settings = resolveEffectiveSettings(theme, state, settingsOverride);
      prepareContainer(container, settings, state, options.ariaLabel, options.positionMode);
      renderer.resize(settings);
      drag?.setPosition(drag.getPosition());
    },
    setAudioSource(audioSource) {
      analyzer.setAudioSource(audioSource);
    },
    setAudioSignal(signal) {
      manualSignal = signal;
    },
    destroy() {
      window.cancelAnimationFrame(frameId);
      drag?.destroy();
      drag = null;
      analyzer.destroy();
      renderer.destroy();
      container.replaceChildren();
    },
  };

  function getSignal(): OrbAudioSignal {
    if (manualSignal) {
      return {
        ...emptySignal,
        ...manualSignal,
      };
    }

    return analyzer.sample(settings);
  }
}

function resolveEffectiveSettings(
  theme: ResolvedOrbTheme,
  state: OrbState,
  settingsOverride: Partial<OrbSettings>,
) {
  return resolveSettings(getThemeSettings(theme, state), settingsOverride);
}

function prepareContainer(
  container: HTMLElement,
  settings: OrbSettings,
  state: OrbState,
  ariaLabel = "Voice assistant orb",
  positionMode: "fixed" | "absolute" = "fixed",
) {
  container.dataset.orbState = state;
  container.style.position = positionMode;
  container.style.width = `${settings.size}px`;
  container.style.height = `${settings.size}px`;
  container.style.touchAction = "none";
  container.style.userSelect = "none";
  container.style.zIndex = container.style.zIndex || "2147483000";
  container.setAttribute("role", "img");
  container.setAttribute("aria-label", ariaLabel);
}
