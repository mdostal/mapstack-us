import { describe, expect, it } from "vitest";
import { driveTimeToConcern } from "@/lib/formula/care-access-concern";

describe("driveTimeToConcern (piecewise-linear, anchored on care-access's own tier boundaries)", () => {
  it("maps 0 minutes to 0 concern", () => {
    expect(driveTimeToConcern(0)).toBe(0);
  });

  it("hits round numbers exactly at each documented tier anchor", () => {
    expect(driveTimeToConcern(30)).toBe(25);
    expect(driveTimeToConcern(60)).toBe(50);
    expect(driveTimeToConcern(120)).toBe(75);
    expect(driveTimeToConcern(240)).toBe(100);
  });

  it("interpolates linearly between anchors", () => {
    expect(driveTimeToConcern(15)).toBe(13); // halfway 0->30 (0->25), rounded
    expect(driveTimeToConcern(90)).toBe(63); // halfway 60->120 (50->75), rounded
  });

  it("caps at 100 for anything past 240 minutes, including implausible haversine outliers", () => {
    expect(driveTimeToConcern(500)).toBe(100);
    expect(driveTimeToConcern(3262.5)).toBe(100); // honolulu-hi's pediatric_cardiac value
  });

  it("is monotonically non-decreasing", () => {
    const samples = [0, 5, 15, 30, 45, 60, 90, 120, 180, 240, 300];
    for (let i = 1; i < samples.length; i++) {
      expect(driveTimeToConcern(samples[i])).toBeGreaterThanOrEqual(driveTimeToConcern(samples[i - 1]));
    }
  });
});
