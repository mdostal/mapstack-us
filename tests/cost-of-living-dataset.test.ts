import { describe, expect, it } from "vitest";
import { costOfLivingDataset } from "@/lib/datasets/cost-of-living";
import cities from "@data/cities.json";

describe("costOfLivingDataset (Dataset interface, twenty-seventh real implementation, real BEA RPP data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(costOfLivingDataset.id).toBe("cost-of-living");
    expect(costOfLivingDataset.layers.map((l) => l.id)).toEqual(["cost_of_living"]);
    expect(costOfLivingDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with an RPP-labeled detail for a metro-tier city", () => {
    const result = costOfLivingDataset.getValue("new-york-ny", "cost_of_living");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("RPP");
    expect(result!.detail).toContain("BEA Regional Price Parities");
  });

  it("labels a state-tier fallback city's detail as a state average, not metro-specific", () => {
    const result = costOfLivingDataset.getValue("durango-co", "cost_of_living");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("state average");
    expect(result!.detail).toContain("no metro-area RPP for this city");
  });

  it("returns null for an unknown city id", () => {
    expect(costOfLivingDataset.getValue("not-a-real-city", "cost_of_living")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(costOfLivingDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (costOfLivingDataset.getValue(city.id, "cost_of_living") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real, well-known expensive metro (San Francisco, CA) scores well above the midpoint", () => {
    const result = costOfLivingDataset.getValue("san-francisco-ca", "cost_of_living");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(75);
  });

  it("a real, well-known cheap metro (Shreveport, LA) scores well below the midpoint", () => {
    const result = costOfLivingDataset.getValue("shreveport-la", "cost_of_living");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
