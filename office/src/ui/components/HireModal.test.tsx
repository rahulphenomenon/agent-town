import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HireModal } from "./HireModal";

describe("HireModal", () => {
  afterEach(() => cleanup());

  it("closes on Escape when open", () => {
    const onClose = vi.fn();

    render(<HireModal open onClose={onClose} onSubmit={vi.fn()} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
