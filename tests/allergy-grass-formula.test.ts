import { describe, expect, it } from "vitest";
import grassScores from "@data/allergy-scores.json";
import {
  DEFAULT_WEIGHTS,
  compress,
  getGrassComponents,
  recomputeGrassScore,
  FORMULA_COMPONENT_KEYS,
} from "@/lib/formula/allergy-grass-formula";

describe("allergy-grass-formula", () => {
  it("compress() leaves values at or below 92 untouched", () => {
    expect(compress(0)).toBe(0);
    expect(compress(92)).toBe(92);
    expect(compress(50)).toBe(50);
  });

  it("compress() tames values above 92 by the documented 0.4 factor", () => {
    expect(compress(102)).toBe(92 + 10 * 0.4);
    expect(compress(192)).toBe(92 + 100 * 0.4);
  });

  it("getGrassComponents returns the five named components for a real city", () => {
    const components = getGrassComponents("new-york-ny");
    expect(components).not.toBeNull();
    expect(Object.keys(components!).sort()).toEqual([...FORMULA_COMPONENT_KEYS].sort());
  });

  it("returns null for an unknown city id", () => {
    expect(getGrassComponents("not-a-real-city")).toBeNull();
  });

  it("recomputing with all-1.0 weights reproduces the shipped score EXACTLY for every one of the 168 cities", () => {
    for (const entry of grassScores) {
      const components = getGrassComponents(entry.id)!;
      const recomputed = recomputeGrassScore(components, DEFAULT_WEIGHTS);
      expect(recomputed, `mismatch for ${entry.id}`).toBe(entry.score);
    }
  });

  it("zeroing out a component's weight removes its contribution", () => {
    const components = getGrassComponents("boise-id")!; // grass-seed-valley member, real turf_boost
    expect(components.turf_boost).toBeGreaterThan(0);

    const withTurf = recomputeGrassScore(components, DEFAULT_WEIGHTS);
    const withoutTurf = recomputeGrassScore(components, { ...DEFAULT_WEIGHTS, turf_boost: 0 });
    expect(withoutTurf).toBeLessThan(withTurf);
  });

  it("doubling a component's weight increases the recomputed score (below the compress ceiling)", () => {
    const components = getGrassComponents("new-york-ny")!;
    const base = recomputeGrassScore(components, DEFAULT_WEIGHTS);
    const doubled = recomputeGrassScore(components, { ...DEFAULT_WEIGHTS, base_season_climate: 2 });
    expect(doubled).toBeGreaterThan(base);
  });

  it("the result is always clamped to [2, 97] regardless of extreme weights", () => {
    const components = getGrassComponents("new-york-ny")!;
    const extremeHigh = recomputeGrassScore(components, {
      base_season_climate: 100,
      turf_boost: 100,
      arid_weed: 100,
      elevation_discount: 100,
      coastal_nudge: 100,
    });
    expect(extremeHigh).toBeLessThanOrEqual(97);

    const extremeLow = recomputeGrassScore(components, {
      base_season_climate: -100,
      turf_boost: -100,
      arid_weed: -100,
      elevation_discount: -100,
      coastal_nudge: -100,
    });
    expect(extremeLow).toBeGreaterThanOrEqual(2);
  });
});
