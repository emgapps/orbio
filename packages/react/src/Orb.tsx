import {
  createOrb,
  type BuiltInThemeName,
  type OrbAudioSignal,
  type OrbController,
  type OrbPosition,
  type OrbPositionMode,
  type OrbSettings,
  type OrbState,
  type OrbTheme,
} from "@emgapps/orb-core";
import {
  type CSSProperties,
  type HTMLAttributes,
  useEffect,
  useMemo,
  useRef,
} from "react";

export type OrbProps = {
  state?: OrbState;
  theme?: BuiltInThemeName | OrbTheme;
  settings?: Partial<OrbSettings>;
  audioSource?: HTMLAudioElement | null;
  draggable?: boolean;
  initialPosition?: OrbPosition;
  positionMode?: OrbPositionMode;
  className?: string;
  style?: CSSProperties;
  ariaLabel?: string;
  onPositionChange?: (position: OrbPosition) => void;
  onAudioSignal?: (signal: OrbAudioSignal) => void;
  onStateChange?: (state: OrbState) => void;
  onError?: (error: Error) => void;
} & Omit<HTMLAttributes<HTMLDivElement>, "children" | "onError">;

type CallbackProps = Pick<
  OrbProps,
  "onPositionChange" | "onAudioSignal" | "onStateChange" | "onError"
>;

export function Orb({
  state,
  theme = "default",
  settings,
  audioSource = null,
  draggable = false,
  initialPosition,
  positionMode,
  className,
  style,
  ariaLabel,
  onPositionChange,
  onAudioSignal,
  onStateChange,
  onError,
  ...rest
}: OrbProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<OrbController | null>(null);
  const callbacksRef = useRef<CallbackProps>({});

  callbacksRef.current = {
    onPositionChange,
    onAudioSignal,
    onStateChange,
    onError,
  };

  const initialX = initialPosition?.x;
  const initialY = initialPosition?.y;

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const controller = createOrb({
      container: containerRef.current,
      state,
      theme,
      settings,
      audioSource,
      draggable,
      initialPosition,
      positionMode,
      ariaLabel,
      onPositionChange: (position) => callbacksRef.current.onPositionChange?.(position),
      onAudioSignal: (signal) => callbacksRef.current.onAudioSignal?.(signal),
      onStateChange: (nextState) => callbacksRef.current.onStateChange?.(nextState),
      onError: (error) => callbacksRef.current.onError?.(error),
    });

    controllerRef.current = controller;

    return () => {
      controller.destroy();
      if (controllerRef.current === controller) {
        controllerRef.current = null;
      }
    };
  }, [ariaLabel, draggable, initialX, initialY, positionMode]);

  useEffect(() => {
    if (state) controllerRef.current?.setState(state);
  }, [state]);

  useEffect(() => {
    controllerRef.current?.setTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (settings) controllerRef.current?.setSettings(settings);
  }, [settings]);

  useEffect(() => {
    controllerRef.current?.setAudioSource(audioSource);
  }, [audioSource]);

  const mergedStyle = useMemo<CSSProperties>(
    () => ({
      ...style,
    }),
    [style],
  );

  return (
    <div
      {...rest}
      ref={containerRef}
      className={className}
      style={mergedStyle}
      data-orb-react-root=""
    />
  );
}
