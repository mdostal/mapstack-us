import { describe, expect, it } from "vitest";
import { incomeDataset } from "@/lib/datasets/income";
import cities from "@data/cities.json";

describe("incomeDataset (Dataset interface, seventeenth real implementation, CHR/ACS county-level data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(incomeDataset.id).toBe("income");
    expect(incomeDataset.layers.map((l) => l.id)).toEqual(["median_income"]);
    expect(incomeDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city", () => {
    const result = incomeDataset.getValue("new-york-ny", "median_income");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("median household income");
    expect(result!.detail).toContain("Census ACS");
  });

  it("scores a lower-income county more concerning than a higher-income one", () => {
    const nyc = incomeDataset.getValue("new-york-ny", "median_income");
    const lowerIncome = incomeDataset.getValue("detroit-mi", "median_income");
    expect(nyc).not.toBeNull();
    expect(lowerIncome).not.toBeNull();
    expect(lowerIncome!.value).toBeGreaterThan(nyc!.value);
  });

  it("returns null for an unknown city id", () => {
    expect(incomeDataset.getValue("not-a-real-city", "median_income")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(incomeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (incomeDataset.getValue(city.id, "median_income") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
