import { describe, expect, it } from "vitest";
import { housingCostBurdenDataset } from "@/lib/datasets/housing-cost-burden";
import cities from "@data/cities.json";

describe("housingCostBurdenDataset (Dataset interface, eighteenth real implementation, CHR/ACS county-level data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(housingCostBurdenDataset.id).toBe("housing-cost-burden");
    expect(housingCostBurdenDataset.layers.map((l) => l.id)).toEqual(["severe_cost_burden"]);
    expect(housingCostBurdenDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a cost-burden-labeled detail for a covered city", () => {
    const result = housingCostBurdenDataset.getValue("new-york-ny", "severe_cost_burden");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("50%+ of income on housing");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns null for an unknown city id", () => {
    expect(housingCostBurdenDataset.getValue("not-a-real-city", "severe_cost_burden")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(housingCostBurdenDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (housingCostBurdenDataset.getValue(city.id, "severe_cost_burden") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
