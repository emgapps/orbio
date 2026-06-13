import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createOrb } from "../create-orb";

describe("createOrb", () => {
  beforeEach(() => {
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => undefined);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("mounts a renderer, sizes the container, and exposes accessible labeling", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const orb = createOrb({
      container,
      settings: { size: 128 },
      ariaLabel: "Assistant orb",
    });

    expect(container.style.width).toBe("128px");
    expect(container.style.height).toBe("128px");
    expect(container.style.position).toBe("fixed");
    expect(container.getAttribute("role")).toBe("img");
    expect(container.getAttribute("aria-label")).toBe("Assistant orb");
    expect(container.firstElementChild?.getAttribute("data-renderer")).toBe("css");

    orb.destroy();
  });

  it("can mount relative to a positioned parent", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const orb = createOrb({
      container,
      initialPosition: { x: 12, y: 18 },
      positionMode: "absolute",
    });

    expect(container.style.position).toBe("absolute");
    expect(container.style.left).toBe("12px");
    expect(container.style.top).toBe("18px");

    orb.destroy();
  });

  it("updates state and settings without remounting the controller", () => {
    const container = document.createElement("div");
    const onStateChange = vi.fn();
    document.body.append(container);

    const orb = createOrb({ container, onStateChange });

    orb.setState("speaking");
    orb.setSettings({ size: 144 });

    expect(container.dataset.orbState).toBe("speaking");
    expect(container.style.width).toBe("144px");
    expect(container.style.height).toBe("144px");
    expect(onStateChange).toHaveBeenCalledWith("speaking");

    orb.setState("disabled");
    expect(container.dataset.orbState).toBe("disabled");
    expect(onStateChange).toHaveBeenCalledWith("disabled");

    orb.setState("error");
    expect(container.dataset.orbState).toBe("error");
    expect(onStateChange).toHaveBeenCalledWith("error");

    orb.destroy();
  });

  it("can drive rendering from a manual audio signal and clear it", () => {
    const frameCallbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      frameCallbacks.push(callback);
      return frameCallbacks.length;
    });
    const container = document.createElement("div");
    const onAudioSignal = vi.fn();
    document.body.append(container);

    const orb = createOrb({
      container,
      audioSignal: { rms: 0.4, energy: 0.5, pulse: 0.6 },
      onAudioSignal,
    });

    frameCallbacks[0]?.(100);

    expect(onAudioSignal).toHaveBeenLastCalledWith({ rms: 0.4, energy: 0.5, pulse: 0.6 });

    orb.setAudioSignal(null);
    frameCallbacks[1]?.(116);

    expect(onAudioSignal).toHaveBeenLastCalledWith({ rms: 0, energy: 0, pulse: 0 });

    orb.destroy();
  });

  it("cleans up renderer children on destroy", () => {
    const container = document.createElement("div");
    document.body.append(container);

    const orb = createOrb({ container });
    expect(container.childElementCount).toBe(1);

    orb.destroy();

    expect(container.childElementCount).toBe(0);
  });
});
