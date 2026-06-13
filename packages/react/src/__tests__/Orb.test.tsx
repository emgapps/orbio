import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Orb } from "../Orb";

describe("Orb", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("mounts the core orb into a React div", async () => {
    const { getByLabelText } = render(<Orb ariaLabel="Test assistant orb" settings={{ size: 112 }} />);
    const root = getByLabelText("Test assistant orb");

    await waitFor(() => {
      expect(root.querySelector("[data-renderer='css']")).not.toBeNull();
    });

    expect(root.style.width).toBe("112px");
    expect(root.style.height).toBe("112px");
  });

  it("updates state and settings through the core controller", async () => {
    const { getByLabelText, rerender } = render(<Orb ariaLabel="Reactive orb" state="idle" />);
    const root = getByLabelText("Reactive orb");

    rerender(<Orb ariaLabel="Reactive orb" state="speaking" settings={{ size: 140 }} />);

    await waitFor(() => {
      expect(root.dataset.orbState).toBe("speaking");
      expect(root.style.width).toBe("140px");
    });

    rerender(<Orb ariaLabel="Reactive orb" state="disabled" settings={{ size: 140 }} />);
    await waitFor(() => {
      expect(root.dataset.orbState).toBe("disabled");
    });

    rerender(<Orb ariaLabel="Reactive orb" state="error" settings={{ size: 140 }} />);
    await waitFor(() => {
      expect(root.dataset.orbState).toBe("error");
    });
  });

  it("forwards manual audio signals to the core controller", async () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    const onAudioSignal = vi.fn();
    const { rerender } = render(
      <Orb
        ariaLabel="Manual signal orb"
        audioSignal={{ rms: 0.4, energy: 0.5, pulse: 0.6 }}
        onAudioSignal={onAudioSignal}
      />,
    );

    await waitFor(() => {
      expect(frameCallbacks.length).toBeGreaterThan(0);
    });
    frameCallbacks[0]?.(100);

    expect(onAudioSignal).toHaveBeenLastCalledWith({ rms: 0.4, energy: 0.5, pulse: 0.6 });

    rerender(<Orb ariaLabel="Manual signal orb" audioSignal={null} onAudioSignal={onAudioSignal} />);
    await waitFor(() => {
      expect(frameCallbacks.length).toBeGreaterThan(1);
    });
    frameCallbacks[1]?.(116);

    expect(onAudioSignal).toHaveBeenLastCalledWith({ rms: 0, energy: 0, pulse: 0 });
  });

  it("destroys the core controller on unmount", () => {
    const { unmount } = render(<Orb ariaLabel="Disposable orb" />);

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
