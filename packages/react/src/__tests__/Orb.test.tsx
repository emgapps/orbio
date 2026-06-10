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

  it("destroys the core controller on unmount", () => {
    const { unmount } = render(<Orb ariaLabel="Disposable orb" />);

    unmount();

    expect(window.cancelAnimationFrame).toHaveBeenCalled();
  });
});
