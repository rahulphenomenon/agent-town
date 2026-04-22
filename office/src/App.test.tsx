import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Office App", () => {
  it("renders the office title and tracker shortcut", () => {
    render(<App />);

    expect(screen.getByText("Paperclip Office")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /view in tracker/i }),
    ).toBeInTheDocument();
  });
});
