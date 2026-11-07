import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";

function renderApp() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <App />
    </QueryClientProvider>,
  );
}

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
    renderApp();

    expect(screen.getAllByText("Paperclip Office").length).toBeGreaterThan(0);
    expect(
      screen.getByRole("button", { name: /view in tracker/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Sound volume 50%" }),
    ).toBeInTheDocument();
  });

  it("cycles the sound control through the available volume steps", () => {
    renderApp();

    const soundButton = screen.getByRole("button", { name: "Sound volume 50%" });

    fireEvent.click(soundButton);
    expect(screen.getByRole("button", { name: "Sound volume 75%" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sound volume 75%" }));
    expect(screen.getByRole("button", { name: "Sound volume 100%" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Sound volume 100%" }));
    expect(screen.getByRole("button", { name: "Sound volume 0%" })).toBeInTheDocument();
  });

  it("retries blocked autoplay at the selected volume before advancing the control", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    play.mockResolvedValue(undefined);

    renderApp();

    expect(play).toHaveBeenCalledTimes(1);
    const soundButton = await screen.findByRole("button", {
      name: "Sound volume 50%, press to start music",
    });

    fireEvent.click(soundButton);

    expect(play).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Sound volume 50%" })).toBeInTheDocument();
  });

  it("retries blocked autoplay on keyboard input without changing the selected volume", async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, "play");
    play.mockRejectedValueOnce(new DOMException("Blocked", "NotAllowedError"));
    play.mockResolvedValue(undefined);

    renderApp();

    expect(play).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", {
      name: "Sound volume 50%, press to start music",
    })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "w" });

    expect(play).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: "Sound volume 50%" })).toBeInTheDocument();
  });
});
