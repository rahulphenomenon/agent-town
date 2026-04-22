import { describe, expect, it } from "vitest";
import { resolveVisualIntent } from "./agent-intent";

describe("resolveVisualIntent", () => {
  it("keeps a readable heading-to-desk transition even if backend status flips quickly", () => {
    const now = 1_000;
    const result = resolveVisualIntent({
      previousIntent: {
        mode: "heading_to_desk",
        targetZone: "desk-1",
        startedAt: now - 300,
      },
      nextMode: "idle",
      nextTargetZone: "watercooler",
      now,
      minTravelMs: 900,
    });

    expect(result.mode).toBe("heading_to_desk");
    expect(result.targetZone).toBe("desk-1");
    expect(result.startedAt).toBe(now - 300);
  });

  it("lets the agent settle once the readable travel window has elapsed", () => {
    const now = 2_000;
    const result = resolveVisualIntent({
      previousIntent: {
        mode: "heading_to_desk",
        targetZone: "desk-2",
        startedAt: now - 1_000,
      },
      nextMode: "idle",
      nextTargetZone: "watercooler",
      now,
      minTravelMs: 900,
    });

    expect(result.mode).toBe("idle");
    expect(result.targetZone).toBe("watercooler");
    expect(result.startedAt).toBe(now);
  });

  it("does not preserve a desk-heading transition when the agent is terminated", () => {
    const now = 3_000;
    const result = resolveVisualIntent({
      previousIntent: {
        mode: "heading_to_desk",
        targetZone: "desk-3",
        startedAt: now - 200,
      },
      nextMode: "terminated",
      nextTargetZone: "spawn",
      now,
      minTravelMs: 900,
    });

    expect(result.mode).toBe("terminated");
    expect(result.targetZone).toBe("spawn");
  });
});
