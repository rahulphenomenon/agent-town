import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SoundButton } from "./SoundButton";

describe("SoundButton", () => {
  it("renders the current sound level as active bars", () => {
    render(<SoundButton stepIndex={3} onClick={() => undefined} />);

    const button = screen.getByRole("button", { name: "Sound volume 75%" });
    expect(button).toBeInTheDocument();

    const activeBars = button.querySelectorAll(".office-sound-button__bar--active");
    expect(activeBars).toHaveLength(3);
  });

  it("delegates clicks to the parent toggle handler", () => {
    const handleClick = vi.fn();
    render(<SoundButton stepIndex={1} onClick={handleClick} />);

    fireEvent.click(screen.getByRole("button", { name: "Sound volume 25%" }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
