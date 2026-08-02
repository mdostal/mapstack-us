import { describe, expect, it } from "vitest";
import { allergyDataset } from "@/lib/datasets/allergy";
import cities from "@data/cities.json";

describe("allergyDataset (ported from allergy-locator, annual-only)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(allergyDataset.id).toBe("allergy");
    expect(allergyDataset.layers.length).toBeGreaterThan(1);
    expect(allergyDataset.supportsTime).toBe(false);
  });

  it("grass returns a real validated score for every one of the 168 spine cities", () => {
    for (const city of cities) {
      const result = allergyDataset.getValue(city.id, "grass");
      expect(result).not.toBeNull();
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

  it("every layer id is unique", () => {
    const ids = allergyDataset.layers.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
