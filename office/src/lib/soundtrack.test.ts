import { describe, expect, it, vi } from "vitest";
import {
  SOUNDTRACK_VOLUME_STEPS,
  getActiveSoundBars,
  getNextSoundtrackStep,
  syncSoundtrackPlayback,
} from "./soundtrack";

describe("soundtrack helpers", () => {
  it("cycles through the available volume steps", () => {
    expect(SOUNDTRACK_VOLUME_STEPS).toEqual([0, 0.25, 0.5, 0.75, 1]);
    expect(getNextSoundtrackStep(0)).toBe(1);
    expect(getNextSoundtrackStep(1)).toBe(2);
    expect(getNextSoundtrackStep(2)).toBe(3);
    expect(getNextSoundtrackStep(3)).toBe(4);
    expect(getNextSoundtrackStep(4)).toBe(0);
  });

  it("maps the volume step to active sound bars", () => {
    expect(getActiveSoundBars(0)).toBe(0);
    expect(getActiveSoundBars(1)).toBe(1);
    expect(getActiveSoundBars(2)).toBe(2);
    expect(getActiveSoundBars(3)).toBe(3);
    expect(getActiveSoundBars(4)).toBe(4);
  });

  it("loops and plays the soundtrack when the volume is on", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audio = { loop: false, volume: 0, play, pause };

    await syncSoundtrackPlayback(audio, 2);

    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0.5);
    expect(play).toHaveBeenCalledTimes(1);
    expect(pause).not.toHaveBeenCalled();
  });

  it("pauses the soundtrack when the volume is muted", async () => {
    const play = vi.fn().mockResolvedValue(undefined);
    const pause = vi.fn();
    const audio = { loop: false, volume: 1, play, pause };

    await syncSoundtrackPlayback(audio, 0);

    expect(audio.loop).toBe(true);
    expect(audio.volume).toBe(0);
    expect(pause).toHaveBeenCalledTimes(1);
    expect(play).not.toHaveBeenCalled();
  });
});
