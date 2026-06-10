import {
  createHtmlAudioSession,
  Orb,
  type AudioSession,
  type AudioSessionEvent,
  type BuiltInThemeName,
  type OrbAudioSignal,
  type OrbPosition,
  type OrbSettings,
  type OrbState,
} from "@voca/orb-react";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const themes: BuiltInThemeName[] = ["default", "calm", "cosmic"];
const carouselWheelDeadZone = 10;
const carouselWheelThreshold = 260;
const carouselWheelCooldownMs = 420;
const carouselWheelIdleResetMs = 280;
const stateOptions = [
  { id: "idle", label: "Idle", state: "idle" },
  { id: "speaking", label: "Speaking", state: "speaking" },
  { id: "unavailable", label: "Unavailable", state: "disabled" },
  { id: "error", label: "Error", state: "error" },
] satisfies Array<{ id: string; label: string; state: OrbState }>;

const audioTracksByTheme: ThemeRecord<string> = {
  default: "/avatar.wav",
  calm: "/avatar-pitched-down.wav",
  cosmic: "/avatar-pitched-up.wav",
};

type ThemeRecord<T> = Record<BuiltInThemeName, T>;
type CarouselFrame = {
  left: number;
  top: number;
  width: number;
  height: number;
};

const emptySignal: OrbAudioSignal = { rms: 0, energy: 0, pulse: 0 };

const initialSettingsByTheme: ThemeRecord<Partial<OrbSettings>> = {
  default: {
    size: 132,
    sensitivity: 0.9,
    speed: 1,
    pulseStrength: 0.75,
    glowStrength: 0.9,
    dprCap: 2,
  },
  calm: {
    size: 132,
    sensitivity: 0.9,
    speed: 0.72,
    pulseStrength: 0.48,
    glowStrength: 0.62,
    dprCap: 2,
  },
  cosmic: {
    size: 132,
    sensitivity: 0.9,
    speed: 1.18,
    pulseStrength: 0.95,
    glowStrength: 1.1,
    dprCap: 2,
  },
};

const initialSignalsByTheme: ThemeRecord<OrbAudioSignal> = {
  default: emptySignal,
  calm: emptySignal,
  cosmic: emptySignal,
};

const initialPositionsByTheme: ThemeRecord<OrbPosition> = {
  default: { x: 24, y: 24 },
  calm: { x: 48, y: 48 },
  cosmic: { x: 72, y: 72 },
};

const initialDraggedByTheme: ThemeRecord<boolean> = {
  default: false,
  calm: false,
  cosmic: false,
};

function App() {
  const audioRefs = useRef<ThemeRecord<HTMLAudioElement | null>>({
    default: null,
    calm: null,
    cosmic: null,
  });
  const audioSessionsRef = useRef<ThemeRecord<AudioSession | null>>({
    default: null,
    calm: null,
    cosmic: null,
  });
  const activeThemeRef = useRef<BuiltInThemeName>("default");
  const carouselStageRef = useRef<HTMLDivElement | null>(null);
  const carouselWheelRef = useRef({
    accumulatedDelta: 0,
    lastNavigationAt: 0,
    lastWheelAt: 0,
  });
  const [audioSource, setAudioSource] = useState<HTMLAudioElement | null>(null);
  const [state, setState] = useState<OrbState>("idle");
  const [activeTheme, setActiveTheme] = useState<BuiltInThemeName>("default");
  const [isPinned, setIsPinned] = useState(true);
  const [settingsByTheme, setSettingsByTheme] = useState<ThemeRecord<Partial<OrbSettings>>>(initialSettingsByTheme);
  const [signalsByTheme, setSignalsByTheme] = useState<ThemeRecord<OrbAudioSignal>>(initialSignalsByTheme);
  const [positionsByTheme, setPositionsByTheme] = useState<ThemeRecord<OrbPosition>>(initialPositionsByTheme);
  const [draggedByTheme, setDraggedByTheme] = useState<ThemeRecord<boolean>>(initialDraggedByTheme);
  const [floatingMountPosition, setFloatingMountPosition] = useState<OrbPosition | null>(null);
  const [carouselFrame, setCarouselFrame] = useState<CarouselFrame | null>(null);

  useEffect(() => {
    const unsubscribeCallbacks: Array<() => void> = [];

    for (const themeName of themes) {
      const audio = audioRefs.current[themeName];
      if (!audio) continue;

      const session = createHtmlAudioSession(audio);
      audioSessionsRef.current[themeName] = session;
      unsubscribeCallbacks.push(session.subscribe((event) => handleAudioSessionEvent(themeName, event)));
    }

    setAudioSource(audioSessionsRef.current.default?.audioSource ?? null);

    return () => {
      for (const unsubscribe of unsubscribeCallbacks) unsubscribe();

      for (const themeName of themes) {
        audioSessionsRef.current[themeName]?.dispose();
        audioSessionsRef.current[themeName] = null;
      }
    };
  }, []);

  useEffect(() => {
    activeThemeRef.current = activeTheme;
  }, [activeTheme]);

  useLayoutEffect(() => {
    if (!isPinned) return undefined;

    const stage = carouselStageRef.current;
    if (!stage) return undefined;

    let frameId = 0;

    const measure = () => {
      frameId = 0;
      const rect = stage.getBoundingClientRect();
      setCarouselFrame((current) => {
        const next = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        };

        if (
          current &&
          Math.abs(current.left - next.left) < 1 &&
          Math.abs(current.top - next.top) < 1 &&
          Math.abs(current.width - next.width) < 1 &&
          Math.abs(current.height - next.height) < 1
        ) {
          return current;
        }

        return next;
      });
    };

    const queueMeasure = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(measure);
    };

    measure();

    const observer = new ResizeObserver(queueMeasure);
    observer.observe(stage);
    window.addEventListener("resize", queueMeasure);
    window.addEventListener("scroll", queueMeasure, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", queueMeasure);
      window.removeEventListener("scroll", queueMeasure);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [isPinned]);

  useEffect(() => {
    if (!isPinned) return undefined;

    const stage = carouselStageRef.current;
    if (!stage) return undefined;

    const handleWheel = (event: WheelEvent) => {
      const delta = getNormalizedWheelDelta(event, stage);
      if (Math.abs(delta) < carouselWheelDeadZone) return;

      event.preventDefault();

      const now = window.performance.now();
      const wheel = carouselWheelRef.current;

      if (now - wheel.lastWheelAt > carouselWheelIdleResetMs || Math.sign(delta) !== Math.sign(wheel.accumulatedDelta)) {
        wheel.accumulatedDelta = 0;
      }

      wheel.lastWheelAt = now;

      if (now - wheel.lastNavigationAt < carouselWheelCooldownMs) return;

      wheel.accumulatedDelta += delta;
      if (Math.abs(wheel.accumulatedDelta) < carouselWheelThreshold) return;

      selectRelativeTheme(wheel.accumulatedDelta > 0 ? 1 : -1);
      wheel.accumulatedDelta = 0;
      wheel.lastNavigationAt = now;
    };

    stage.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      stage.removeEventListener("wheel", handleWheel);
      carouselWheelRef.current.accumulatedDelta = 0;
      carouselWheelRef.current.lastWheelAt = 0;
    };
  }, [isPinned]);

  const isSpeaking = state === "speaking";
  const activeSettings = settingsByTheme[activeTheme];
  const activeSignal = signalsByTheme[activeTheme];
  const activePosition = getVisiblePosition(activeTheme);

  const signalStyle = useMemo(
    () => ({
      "--energy": `${Math.round(activeSignal.energy * 100)}%`,
      "--pulse": `${Math.round(activeSignal.pulse * 100)}%`,
    }),
    [activeSignal.energy, activeSignal.pulse],
  );

  async function togglePlayback() {
    const session = getAudioSession(activeTheme);
    if (!session) return;

    if (isSpeaking) {
      session.pause();
      return;
    }

    await playThemeAudio(activeTheme, false);
  }

  function updateSetting(key: keyof OrbSettings, value: number) {
    setSettingsByTheme((current) => ({
      ...current,
      [activeTheme]: {
        ...current[activeTheme],
        [key]: value,
      },
    }));
  }

  function updateSignal(themeName: BuiltInThemeName, signal: OrbAudioSignal) {
    setSignalsByTheme((current) => ({
      ...current,
      [themeName]: signal,
    }));
  }

  function updateFloatingPosition(themeName: BuiltInThemeName, position: OrbPosition) {
    setPositionsByTheme((current) => ({
      ...current,
      [themeName]: position,
    }));
    setDraggedByTheme((current) => ({
      ...current,
      [themeName]: true,
    }));
  }

  function selectTheme(nextTheme: BuiltInThemeName) {
    if (nextTheme === activeThemeRef.current) return;

    activeThemeRef.current = nextTheme;
    setActiveTheme(nextTheme);

    if (!isPinned) {
      const nextPosition = getFloatingStartPosition(nextTheme);
      setFloatingMountPosition(nextPosition);
      setPositionsByTheme((current) => ({
        ...current,
        [nextTheme]: nextPosition,
      }));
    }

    void playThemeAudio(nextTheme, true);
  }

  function selectRelativeTheme(direction: -1 | 1) {
    const currentIndex = themes.indexOf(activeThemeRef.current);
    const nextIndex = (currentIndex + direction + themes.length) % themes.length;
    selectTheme(themes[nextIndex]);
  }

  function togglePinned() {
    if (isPinned) {
      const nextPosition = getFloatingStartPosition(activeTheme);
      setFloatingMountPosition(nextPosition);
      setPositionsByTheme((current) => ({
        ...current,
        [activeTheme]: nextPosition,
      }));
      setIsPinned(false);
      return;
    }

    setIsPinned(true);
  }

  function getCarouselSlot(themeName: BuiltInThemeName, centeredTheme = activeTheme) {
    const themeIndex = themes.indexOf(themeName);
    const centerIndex = themes.indexOf(centeredTheme);
    const offset = (themeIndex - centerIndex + themes.length) % themes.length;
    if (offset === 0) return 0;
    return offset === 1 ? 1 : -1;
  }

  function getCarouselPosition(themeName: BuiltInThemeName, centeredTheme = activeTheme): OrbPosition | null {
    if (!carouselFrame) return null;

    const slot = getCarouselSlot(themeName, centeredTheme);
    const size = settingsByTheme[themeName].size ?? 132;
    const spacing = Math.min(220, Math.max(118, carouselFrame.width * 0.3));
    const centerX = carouselFrame.width / 2 + slot * spacing;
    const centerY = carouselFrame.height / 2;

    return {
      x: centerX - size / 2,
      y: centerY - size / 2,
    };
  }

  function getCarouselViewportPosition(themeName: BuiltInThemeName, centeredTheme = activeTheme): OrbPosition | null {
    const position = getCarouselPosition(themeName, centeredTheme);
    if (!position || !carouselFrame) return null;

    return {
      x: carouselFrame.left + position.x,
      y: carouselFrame.top + position.y,
    };
  }

  function getFloatingStartPosition(themeName: BuiltInThemeName) {
    if (draggedByTheme[themeName]) return positionsByTheme[themeName];

    return getCarouselViewportPosition(themeName, themeName) ?? positionsByTheme[themeName];
  }

  function getVisiblePosition(themeName: BuiltInThemeName) {
    if (!isPinned) return positionsByTheme[themeName];

    return getCarouselViewportPosition(themeName) ?? positionsByTheme[themeName];
  }

  function getAudioSession(themeName: BuiltInThemeName) {
    return audioSessionsRef.current[themeName];
  }

  function pauseInactiveAudioSessions(themeName: BuiltInThemeName) {
    for (const candidateTheme of themes) {
      if (candidateTheme === themeName) continue;

      getAudioSession(candidateTheme)?.pause({ reset: true });
    }
  }

  async function playThemeAudio(themeName: BuiltInThemeName, restart: boolean) {
    const session = getAudioSession(themeName);
    if (!session) return;

    activeThemeRef.current = themeName;
    pauseInactiveAudioSessions(themeName);

    setAudioSource(session.audioSource);

    try {
      await session.play({ restart });
      setState("speaking");
    } catch (error) {
      setState("error");
      console.error(error);
    }
  }

  function handleAudioSessionEvent(themeName: BuiltInThemeName, event: AudioSessionEvent) {
    if (event.status === "ended") {
      getAudioSession(themeName)?.reset();
      updateSignal(themeName, emptySignal);
    }

    if (activeThemeRef.current !== themeName) return;

    if (event.status === "playing") {
      setState("speaking");
      return;
    }

    if (event.status === "idle" || event.status === "paused" || event.status === "ended") {
      setState("idle");
      return;
    }

    if (event.status === "error") {
      setState("error");
      if (event.error) console.error(event.error);
    }
  }

  const pinnedOrbs = isPinned
    ? themes
        .map((themeName) => {
          const position = getCarouselPosition(themeName);
          if (!position) return null;

          const isActive = themeName === activeTheme;
          const mountPosition = initialPositionsByTheme[themeName];
          const offsetX = position.x - mountPosition.x;
          const offsetY = position.y - mountPosition.y;

          return (
            <Orb
              ariaLabel={`${themeName} theme orb`}
              audioSource={isActive ? audioSource : null}
              className={isActive ? "carousel-orb active" : "carousel-orb"}
              data-active={isActive ? "true" : "false"}
              data-orb-theme={themeName}
              data-testid={`orb-${themeName}`}
              draggable={false}
              initialPosition={mountPosition}
              key={themeName}
              positionMode="absolute"
              settings={settingsByTheme[themeName]}
              state={state}
              style={{
                zIndex: isActive ? 28 : 18,
                opacity: isActive ? 1 : 0.66,
                transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
              }}
              theme={themeName}
              onAudioSignal={isActive ? (signal) => updateSignal(themeName, signal) : undefined}
              onClick={() => selectTheme(themeName)}
            />
          );
        })
        .filter(Boolean)
    : null;

  return (
    <main className="app-shell">
      {!isPinned && (
        <Orb
          ariaLabel={`${activeTheme} theme draggable orb`}
          audioSource={audioSource}
          className="floating-orb active"
          data-active="true"
          data-orb-theme={activeTheme}
          data-testid={`orb-${activeTheme}`}
          draggable
          initialPosition={floatingMountPosition ?? positionsByTheme[activeTheme]}
          key={`floating-${activeTheme}`}
          settings={activeSettings}
          state={state}
          style={{ zIndex: 80 }}
          theme={activeTheme}
          onAudioSignal={(signal) => updateSignal(activeTheme, signal)}
          onPositionChange={(position) => updateFloatingPosition(activeTheme, position)}
        />
      )}

      <section className="workspace" aria-label="Orbio MVP controls">
        <header className="topbar">
          <div>
            <p className="eyebrow">Orbio MVP</p>
            <h1>Voice orb concept probe</h1>
          </div>
          <button className="play-button" type="button" onClick={togglePlayback} data-testid="play-toggle">
            {isSpeaking ? "Pause audio" : "Play audio"}
          </button>
        </header>

        <div className="control-grid">
          <section className="panel theme-panel">
            <div className="panel-heading">
              <h2>Theme</h2>
              <button className="pin-button" type="button" onClick={togglePinned} data-testid="pin-toggle">
                {isPinned ? "Unpin" : "Pin"}
              </button>
            </div>

            {isPinned ? (
              <div className="carousel-shell">
                <button
                  aria-label="Previous theme"
                  className="carousel-button previous"
                  data-testid="carousel-previous"
                  type="button"
                  onClick={() => selectRelativeTheme(-1)}
                >
                  &lsaquo;
                </button>
                <div
                  aria-label="Theme carousel"
                  className="carousel-stage"
                  data-active-theme={activeTheme}
                  data-testid="theme-carousel"
                  ref={carouselStageRef}
                  role="group"
                  tabIndex={0}
                >
                  {pinnedOrbs}
                  <div className="carousel-labels" aria-hidden="true">
                    <span className="carousel-label active" data-testid="active-theme-label">
                      {activeTheme}
                    </span>
                  </div>
                </div>
                <button
                  aria-label="Next theme"
                  className="carousel-button next"
                  data-testid="carousel-next"
                  type="button"
                  onClick={() => selectRelativeTheme(1)}
                >
                  &rsaquo;
                </button>
              </div>
            ) : (
              <div className="theme-row" role="group" aria-label="Theme" data-testid="theme-selector">
                {themes.map((themeName) => (
                  <button
                    className={activeTheme === themeName ? "theme-button active" : "theme-button"}
                    data-testid={`theme-option-${themeName}`}
                    key={themeName}
                    type="button"
                    onClick={() => selectTheme(themeName)}
                  >
                    <span className={`theme-swatch ${themeName}`} aria-hidden="true" />
                    {themeName}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="panel state-panel">
            <div className="panel-heading">
              <h2>State</h2>
              <span className="state-value" data-testid="active-state-label">
                {getStateLabel(state)}
              </span>
            </div>
            <div className="state-segmented" role="group" aria-label="Orb state" data-testid="state-selector">
              {stateOptions.map((option) => {
                const isSelected = state === option.state;

                return (
                  <button
                    aria-pressed={isSelected}
                    className={isSelected ? "state-option active" : "state-option"}
                    data-testid={`state-option-${option.id}`}
                    key={option.id}
                    type="button"
                    onClick={() => setState(option.state)}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel">
            <h2>Graphic Settings</h2>
            <Slider
              label="Size"
              max={220}
              min={72}
              step={1}
              testId="setting-size"
              value={activeSettings.size ?? 132}
              onChange={(value) => updateSetting("size", value)}
            />
            <Slider
              label="Sensitivity"
              max={2}
              min={0}
              step={0.05}
              testId="setting-sensitivity"
              value={activeSettings.sensitivity ?? 0.9}
              onChange={(value) => updateSetting("sensitivity", value)}
            />
            <Slider
              label="Speed"
              max={2.4}
              min={0.2}
              step={0.01}
              testId="setting-speed"
              value={activeSettings.speed ?? 1}
              onChange={(value) => updateSetting("speed", value)}
            />
            <Slider
              label="Pulse"
              max={1.5}
              min={0}
              step={0.01}
              testId="setting-pulse"
              value={activeSettings.pulseStrength ?? 0.75}
              onChange={(value) => updateSetting("pulseStrength", value)}
            />
            <Slider
              label="Glow"
              max={1.5}
              min={0}
              step={0.01}
              testId="setting-glow"
              value={activeSettings.glowStrength ?? 0.9}
              onChange={(value) => updateSetting("glowStrength", value)}
            />
          </section>

          <section className="panel">
            <h2>Signal</h2>
            <div className="meter-stack" style={signalStyle as React.CSSProperties}>
              <Meter label="Energy" value={activeSignal.energy} cssVar="--energy" />
              <Meter label="Pulse" value={activeSignal.pulse} cssVar="--pulse" />
              <Meter label="RMS" value={activeSignal.rms} />
            </div>
          </section>

          <section className="panel">
            <h2>Position</h2>
            <div className="position-readout" data-testid="position-readout">
              <span>x {Math.round(activePosition.x)}</span>
              <span>y {Math.round(activePosition.y)}</span>
            </div>
          </section>
        </div>
      </section>

      {themes.map((themeName) => (
        <audio
          data-testid={`audio-${themeName}`}
          key={themeName}
          preload="auto"
          ref={(element) => {
            audioRefs.current[themeName] = element;
          }}
          src={audioTracksByTheme[themeName]}
        />
      ))}
    </main>
  );
}

function getNormalizedWheelDelta(event: WheelEvent, stage: HTMLElement) {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return delta * 16;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return delta * stage.clientHeight;
  return delta;
}

function getStateLabel(state: OrbState) {
  if (state === "disabled") return "Unavailable";
  return state[0].toUpperCase() + state.slice(1);
}

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  testId: string;
  value: number;
  onChange: (value: number) => void;
};

function Slider({ label, min, max, step, testId, value, onChange }: SliderProps) {
  return (
    <label className="slider">
      <span>
        {label}
        <strong>{value.toFixed(step < 1 ? 2 : 0)}</strong>
      </span>
      <input
        data-testid={testId}
        max={max}
        min={min}
        step={step}
        type="range"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

function Meter({ label, value, cssVar }: { label: string; value: number; cssVar?: string }) {
  const testId = `meter-${label.toLowerCase()}`;

  return (
    <div className="meter">
      <span>
        {label}
        <strong data-testid={testId}>{value.toFixed(3)}</strong>
      </span>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: cssVar ? `var(${cssVar})` : `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
