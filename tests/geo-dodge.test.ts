import { describe, expect, it } from "vitest";
import { dodgePoints } from "@/lib/geo/dodge";
import cities from "@data/cities.json";
import { projectLatLon } from "@/lib/geo/projection";

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

describe("point dodging (dense-metro marker overlap, task #23)", () => {
  it("leaves already-separated points untouched", () => {
    const points = [
      { id: "a", x: 0, y: 0 },
      { id: "b", x: 100, y: 100 },
    ];
    const dodged = dodgePoints(points, 5);
    expect(dodged).toEqual(points);
  });

  it("separates two overlapping points to at least minDistance apart", () => {
    const points = [
      { id: "a", x: 10, y: 10 },
      { id: "b", x: 11, y: 10 },
    ];
    const dodged = dodgePoints(points, 6);
    expect(distance(dodged[0], dodged[1])).toBeGreaterThanOrEqual(5.99);
  });

  it("separates a tight cluster of several identical-ish points", () => {
    const points = Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, x: 50, y: 50 }));
    const dodged = dodgePoints(points, 4);
    for (let i = 0; i < dodged.length; i++) {
      for (let j = i + 1; j < dodged.length; j++) {
        expect(distance(dodged[i], dodged[j])).toBeGreaterThanOrEqual(3.9);
      }
    }
  });

  it("preserves every non-position field on each point", () => {
    const points = [{ id: "grass", x: 5, y: 5, label: "Austin" }];
    const dodged = dodgePoints(points, 1);
    expect(dodged[0].id).toBe("grass");
    expect(dodged[0].label).toBe("Austin");
  });

  it("real-world regression: the dense Phoenix-AZ metro cluster ends up fully separated", () => {
    const azCities = cities.filter((c) => c.state === "AZ");
    const points = azCities
      .map((c) => {
        const xy = projectLatLon(c.lat, c.lon);
        return xy ? { id: c.id, city: c.city, x: xy[0], y: xy[1] } : null;
      })
      .filter((p): p is { id: string; city: string; x: number; y: number } => p !== null);

    // Ground truth before dodging: several pairs sit under 6 units apart
    // (e.g. Phoenix/Tempe ~2.45, Chandler/Gilbert ~1.29) -- well inside a
    // marker's own radius, the actual overlap this story tracks.
    const before = points.some((a, i) =>
      points.slice(i + 1).some((b) => distance(a, b) < 6),
    );
    expect(before).toBe(true);

    const dodged = dodgePoints(points, 6);
    for (let i = 0; i < dodged.length; i++) {
      for (let j = i + 1; j < dodged.length; j++) {
        expect(distance(dodged[i], dodged[j])).toBeGreaterThanOrEqual(5.9);
      }
    }
  });

  it("computes the full 168-city spine fast enough for a one-time module-load cost", () => {
    const points = cities
      .map((c) => {
        const xy = projectLatLon(c.lat, c.lon);
        return xy ? { id: c.id, x: xy[0], y: xy[1] } : null;
      })
      .filter((p): p is { id: string; x: number; y: number } => p !== null);

    const start = performance.now();
    dodgePoints(points, 6);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });
});
