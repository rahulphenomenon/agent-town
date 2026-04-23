import { describe, expect, it } from "vitest";
import { normalizeVelocity } from "./playerMovement";

describe("normalizeVelocity", () => {
  it("keeps diagonal movement speed constant", () => {
    const velocity = normalizeVelocity({ x: 1, y: 1 }, 120);

    expect(Math.round(velocity.x)).toBe(85);
    expect(Math.round(velocity.y)).toBe(85);
  });
});
