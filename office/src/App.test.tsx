import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

describe("Office App", () => {
  beforeEach(() => {
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("renders the office title and tracker shortcut", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("Paperclip Office").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /view in tracker/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sound volume 50%" }),
    ).toBeInTheDocument();
  });

  it("cycles the sound control through the available volume steps", () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <App />
      </QueryClientProvider>,
    );

    const soundButton = screen.getByRole("button", { name: "Sound volume 50%" });

    fireEvent.click(soundButton);
    expect(screen.getByRole("button", { name: "Sound volume 75%" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sound volume 75%" }));
    expect(screen.getByRole("button", { name: "Sound volume 100%" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sound volume 100%" }));
    expect(screen.getByRole("button", { name: "Sound volume 0%" })).toBeInTheDocument();
  });
});
