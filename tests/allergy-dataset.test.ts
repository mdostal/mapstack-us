import { describe, expect, it } from "vitest";
import { allergyDataset } from "@/lib/datasets/allergy";
import cities from "@data/cities.json";
import grassScores from "@data/allergy-scores.json";
import allergensData from "@data/allergens.json";

describe("allergyDataset (ported from allergy-locator, annual-only)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(allergyDataset.id).toBe("allergy");
    expect(allergyDataset.layers.length).toBeGreaterThan(1);
    expect(allergyDataset.supportsTime).toBe(false);
  });

  it("grass returns a real validated score for every spine city -- scripts/gen_allergy_scores.py covers the full spine, not just the original 168", () => {
    expect(grassScores.length).toBe(cities.length);
    for (const city of cities) {
      const result = allergyDataset.getValue(city.id, "grass");
      expect(result, city.id).not.toBeNull();
      expect(result!.value).toBeGreaterThanOrEqual(0);
      expect(result!.value).toBeLessThanOrEqual(100);
    }
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

  it("every comprehensive (non-grass) allergen covers the full spine -- scripts/gen_allergens.py, same as grass", () => {
    expect(allergensData.scores.length).toBe(allergensData.allergens.length * cities.length);
    const sampleAllergen = allergensData.allergens[0].id;
    for (const city of cities) {
      const result = allergyDataset.getValue(city.id, sampleAllergen);
      expect(result, `${sampleAllergen} / ${city.id}`).not.toBeNull();
    }
  });

  it("the state-gated original-panel allergens (e.g. ragweed) honestly score 0 where USDA PLANTS lists no presence", () => {
    // Real content check, not just a coverage check: this allergen's score is
    // gated by real per-state presence data, not purely climate zone -- verify
    // the gate is actually doing something (both a positive and a zeroed case
    // exist), not just always returning a nonzero modeled number.
    const scores = allergensData.scores.filter((s) => s.allergen_id === "ragweed");
    expect(scores.some((s) => s.score === 0)).toBe(true);
    expect(scores.some((s) => s.score > 0)).toBe(true);
  });

  it("every layer id is unique", () => {
    const ids = allergyDataset.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
