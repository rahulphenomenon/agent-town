import { describe, expect, it } from "vitest";
import { getCollisionRects, getRouteForZones } from "./officeLayout";

describe("officeLayout", () => {
  it("routes watercooler to desk through the corridor graph", () => {
    const route = getRouteForZones("watercooler", "desk-1");

    expect(route[0]?.id).toBe("watercooler");
    expect(route.at(-1)?.id).toBe("desk-1");
    expect(route.map((node) => node.id)).toContain("hallway-center");
  });

  it("exposes obstacle rectangles for desk banks and lounge furniture", () => {
    const rectIds = getCollisionRects().map((rect) => rect.id);

    expect(rectIds).toEqual(
      expect.arrayContaining([
        "desk-bank-top",
        "desk-bank-bottom",
        "couch-block",
      ]),
    );
  });
});
