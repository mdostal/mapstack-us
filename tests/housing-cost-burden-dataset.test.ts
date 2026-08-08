import { describe, expect, it } from "vitest";
import { housingCostBurdenDataset } from "@/lib/datasets/housing-cost-burden";
import cities from "@data/cities.json";

describe("housingCostBurdenDataset (Dataset interface, eighteenth real implementation, direct Census API place-level data, 2009-2023)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(housingCostBurdenDataset.id).toBe("housing-cost-burden");
    expect(housingCostBurdenDataset.layers.map((l) => l.id)).toEqual(["severe_cost_burden"]);
    expect(housingCostBurdenDataset.supportsTime).toBe(true);
    expect(housingCostBurdenDataset.availableYears![0]).toBe(2009);
    expect(housingCostBurdenDataset.availableYears![housingCostBurdenDataset.availableYears!.length - 1]).toBe(2023);
  });

  it("returns a 0-100 value with a cost-burden-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = housingCostBurdenDataset.getValue("new-york-ny", "severe_cost_burden");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("50%+ of income on housing");
    expect(result!.detail).toContain("2023");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    const result = housingCostBurdenDataset.getValue("new-york-ny", "severe_cost_burden", { year: 2009 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("2009");
  });

  it("returns null for a year before the real ACS5 floor, not a fabricated value", () => {
    expect(housingCostBurdenDataset.getValue("new-york-ny", "severe_cost_burden", { year: 2008 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(housingCostBurdenDataset.getValue("not-a-real-city", "severe_cost_burden")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(housingCostBurdenDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (housingCostBurdenDataset.getValue(city.id, "severe_cost_burden") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(20);
  });
});
