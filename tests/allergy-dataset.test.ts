import { describe, expect, it } from "vitest";
import { allergyDataset } from "@/lib/datasets/allergy";
import cities from "@data/cities.json";
import grassScores from "@data/allergy-scores.json";

describe("allergyDataset (ported from allergy-locator, annual-only)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(allergyDataset.id).toBe("allergy");
    expect(allergyDataset.layers.length).toBeGreaterThan(1);
    expect(allergyDataset.supportsTime).toBe(false);
  });

  it("grass returns a real validated score for every city with a shipped score", () => {
    for (const entry of grassScores) {
      const result = allergyDataset.getValue(entry.id, "grass");
      expect(result).not.toBeNull();
      expect(result!.value).toBeGreaterThanOrEqual(0);
      expect(result!.value).toBeLessThanOrEqual(100);
    }
  });

  it("returns null (not a fabricated value) for a spine city the allergy model hasn't been extended to yet", () => {
    // The city spine (data/cities.json) has grown ahead of allergy-scores.json's
    // own coverage -- see .pHive/epics/data-store/docs/full-resolution-spine-decision.md.
    // A gap here must stay an honest null, never an interpolated/guessed score.
    const scoredIds = new Set(grassScores.map((e) => e.id));
    const uncoveredCity = cities.find((c) => !scoredIds.has(c.id));
    expect(uncoveredCity, "expected at least one spine city ahead of allergy-scores.json's coverage").toBeDefined();
    expect(allergyDataset.getValue(uncoveredCity!.id, "grass")).toBeNull();
  });

  it("returns null for an unknown city id, not a fabricated value", () => {
    expect(allergyDataset.getValue("not-a-real-city", "grass")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(allergyDataset.getValue("new-york-ny", "not-a-real-allergen")).toBeNull();
  });

  it("a non-grass allergen returns a modeled score where the source data has one", () => {
    const result = allergyDataset.getValue("new-york-ny", "tall-fescue");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("/100");
  });

  it("every layer id is unique", () => {
    const ids = allergyDataset.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
