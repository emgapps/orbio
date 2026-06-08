import { Orb, type BuiltInThemeName, type OrbAudioSignal, type OrbSettings, type OrbState } from "@voca/orb-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const themes: BuiltInThemeName[] = ["default", "calm", "cosmic"];

const initialSettings: Partial<OrbSettings> = {
  size: 132,
  sensitivity: 0.9,
  speed: 1,
  pulseStrength: 0.75,
  glowStrength: 0.9,
  dprCap: 2,
};

function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioSource, setAudioSource] = useState<HTMLAudioElement | null>(null);
  const [state, setState] = useState<OrbState>("idle");
  const [theme, setTheme] = useState<BuiltInThemeName>("default");
  const [settings, setSettings] = useState<Partial<OrbSettings>>(initialSettings);
  const [signal, setSignal] = useState<OrbAudioSignal>({ rms: 0, energy: 0, pulse: 0 });
  const [position, setPosition] = useState({ x: 24, y: 24 });

  useEffect(() => {
    setAudioSource(audioRef.current);
  }, []);

  const isSpeaking = state === "speaking";

  const signalStyle = useMemo(
    () => ({
      "--energy": `${Math.round(signal.energy * 100)}%`,
      "--pulse": `${Math.round(signal.pulse * 100)}%`,
    }),
    [signal.energy, signal.pulse],
  );

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isSpeaking) {
      audio.pause();
      setState("idle");
      return;
    }

    try {
      await audio.play();
      setState("speaking");
    } catch (error) {
      setState("error");
      console.error(error);
    }
  }

  function updateSetting(key: keyof OrbSettings, value: number) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  return (
    <main className="app-shell">
      <Orb
        ariaLabel="Draggable voice orb"
        audioSource={audioSource}
        draggable
        initialPosition={{ x: 24, y: 24 }}
        settings={settings}
        state={state}
        theme={theme}
        onAudioSignal={setSignal}
        onPositionChange={setPosition}
      />

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
          <section className="panel">
            <h2>Theme</h2>
            <div className="theme-row" role="group" aria-label="Theme">
              {themes.map((name) => (
                <button
                  className={theme === name ? "theme-button active" : "theme-button"}
                  key={name}
                  type="button"
                  onClick={() => setTheme(name)}
                >
                  <span className={`theme-swatch ${name}`} aria-hidden="true" />
                  {name}
                </button>
              ))}
            </div>
          </section>

          <section className="panel">
            <h2>Graphic Settings</h2>
            <Slider
              label="Size"
              max={220}
              min={72}
              step={1}
              value={settings.size ?? 132}
              onChange={(value) => updateSetting("size", value)}
            />
            <Slider
              label="Sensitivity"
              max={2}
              min={0}
              step={0.05}
              value={settings.sensitivity ?? 0.9}
              onChange={(value) => updateSetting("sensitivity", value)}
            />
            <Slider
              label="Speed"
              max={2.4}
              min={0.2}
              step={0.05}
              value={settings.speed ?? 1}
              onChange={(value) => updateSetting("speed", value)}
            />
            <Slider
              label="Pulse"
              max={1.5}
              min={0}
              step={0.05}
              value={settings.pulseStrength ?? 0.75}
              onChange={(value) => updateSetting("pulseStrength", value)}
            />
            <Slider
              label="Glow"
              max={1.5}
              min={0}
              step={0.05}
              value={settings.glowStrength ?? 0.9}
              onChange={(value) => updateSetting("glowStrength", value)}
            />
          </section>

          <section className="panel">
            <h2>Signal</h2>
            <div className="meter-stack" style={signalStyle as React.CSSProperties}>
              <Meter label="Energy" value={signal.energy} cssVar="--energy" />
              <Meter label="Pulse" value={signal.pulse} cssVar="--pulse" />
              <Meter label="RMS" value={signal.rms} />
            </div>
          </section>

          <section className="panel">
            <h2>Position</h2>
            <div className="position-readout" data-testid="position-readout">
              <span>x {Math.round(position.x)}</span>
              <span>y {Math.round(position.y)}</span>
            </div>
          </section>
        </div>
      </section>

      <audio
        ref={audioRef}
        src="/avatar.wav"
        preload="auto"
        onEnded={() => {
          if (audioRef.current) audioRef.current.currentTime = 0;
          setState("idle");
        }}
        onPause={() => setState("idle")}
        onPlay={() => setState("speaking")}
      />
    </main>
  );
}

type SliderProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
};

function Slider({ label, min, max, step, value, onChange }: SliderProps) {
  return (
    <label className="slider">
      <span>
        {label}
        <strong>{value.toFixed(step < 1 ? 2 : 0)}</strong>
      </span>
      <input
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
  return (
    <div className="meter">
      <span>
        {label}
        <strong>{value.toFixed(3)}</strong>
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
