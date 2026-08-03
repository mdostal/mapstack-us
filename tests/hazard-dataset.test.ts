import { describe, expect, it } from "vitest";
import { hazardDataset } from "@/lib/datasets/hazard";
import cities from "@data/cities.json";

describe("hazardDataset (Dataset interface, fifth real implementation, county-level FEMA NRI)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(hazardDataset.id).toBe("hazard");
    expect(hazardDataset.layers.map((l) => l.id).sort()).toEqual([
      "coastal_flood",
      "inland_flood",
      "risk",
      "wildfire",
    ]);
    expect(hazardDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rating+county-labeled detail for a covered city", () => {
    const result = hazardDataset.getValue("new-york-ny", "risk");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("County");
    expect(result!.detail).toContain("FEMA National Risk Index");
  });

  it("returns null for coastal flooding on a landlocked city, not a fabricated zero", () => {
    // Denver is nowhere near a coast -- FEMA marks this county's coastal
    // flood rating "Not Applicable", which must stay a real null, not 0.
    expect(hazardDataset.getValue("denver-co", "coastal_flood")).toBeNull();
  });

  it("returns a real, nonzero coastal flood value for a genuinely coastal city", () => {
    const result = hazardDataset.getValue("miami-fl", "coastal_flood");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(0);
  });

  it("returns null for an unknown city id", () => {
    expect(hazardDataset.getValue("not-a-real-city", "risk")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(hazardDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine (every city resolves to some US county)", () => {
    for (const city of cities) {
      const result = hazardDataset.getValue(city.id, "risk");
      expect(result, `expected a risk value for ${city.id}`).not.toBeNull();
    }
  });
});
