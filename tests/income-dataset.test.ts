import { describe, expect, it } from "vitest";
import { incomeDataset } from "@/lib/datasets/income";
import cities from "@data/cities.json";

describe("incomeDataset (Dataset interface, seventeenth real implementation, direct Census API place-level data, 2009-2023)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(incomeDataset.id).toBe("income");
    expect(incomeDataset.layers.map((l) => l.id)).toEqual(["median_income"]);
    expect(incomeDataset.supportsTime).toBe(true);
    expect(incomeDataset.availableYears![0]).toBe(2009);
    expect(incomeDataset.availableYears![incomeDataset.availableYears!.length - 1]).toBe(2023);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = incomeDataset.getValue("new-york-ny", "median_income");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("median household income");
    expect(result!.detail).toContain("2023");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    const result = incomeDataset.getValue("new-york-ny", "median_income", { year: 2009 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("2009");
  });

  it("returns null for a year before the real ACS5 floor, not a fabricated value", () => {
    expect(incomeDataset.getValue("new-york-ny", "median_income", { year: 2008 })).toBeNull();
  });

  it("scores a lower-income city more concerning than a higher-income one", () => {
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

  it("has a real value for the large majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (incomeDataset.getValue(city.id, "median_income") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(20);
  });

  it("regression: uses a real ordinal suffix, not a hardcoded 'th'", () => {
    // alhambra-ca's real 2023 concern is 40.2 -- a real value the old
    // hardcoded "th" bug would have wrongly rendered as "40.2th percentile".
    const result = incomeDataset.getValue("alhambra-ca", "median_income", { year: 2023 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("40.2nd percentile");
  });
});
