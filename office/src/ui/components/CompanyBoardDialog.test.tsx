import { cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CompanyBoardDialog } from "./CompanyBoardDialog";

describe("CompanyBoardDialog", () => {
  afterEach(() => cleanup());

  it("closes on Escape when open", () => {
    const onClose = vi.fn();

    render(
      <CompanyBoardDialog
        open
        companyName="Paperclip Office"
        goals={["Ship the sprint"]}
        staff={[]}
        onClose={onClose}
      />,
    );

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
