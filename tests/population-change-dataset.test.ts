import { describe, expect, it } from "vitest";
import { populationChangeDataset } from "@/lib/datasets/population-change";
import cities from "@data/cities.json";

describe("populationChangeDataset (Dataset interface, twenty-sixth real implementation, direct Census API data, 2001-2023 year-over-year)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(populationChangeDataset.id).toBe("population-change");
    expect(populationChangeDataset.layers.map((l) => l.id)).toEqual(["population_change"]);
    expect(populationChangeDataset.supportsTime).toBe(true);
    expect(populationChangeDataset.availableYears![0]).toBe(2001);
    expect(populationChangeDataset.availableYears![populationChangeDataset.availableYears!.length - 1]).toBe(2023);
  });

  it("returns a 0-100 value with a change-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = populationChangeDataset.getValue("new-york-ny", "population_change");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("population");
    expect(result!.detail).toContain("2023");
  });

  it("returns null for an unknown city id", () => {
    expect(populationChangeDataset.getValue("not-a-real-city", "population_change")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(populationChangeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (populationChangeDataset.getValue(city.id, "population_change") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });

  it("a real, well-known booming city (Queen Creek, AZ) scores 0 concern in a real growth year -- growth is not penalized", () => {
    const result = populationChangeDataset.getValue("queen-creek-az", "population_change", { year: 2023 });
    expect(result).not.toBeNull();
    expect(result!.value).toBe(0);
    expect(result!.detail).toContain("growth");
  });

  it("captures the real, historically-documented New Orleans post-Katrina population collapse (2006)", () => {
    const result = populationChangeDataset.getValue("new-orleans-la", "population_change", { year: 2006 });
    expect(result).not.toBeNull();
    expect(result!.value).toBe(100);
    expect(result!.detail).toContain("decline");
    expect(result!.detail).toContain("-53.43%");
  });

  it("real values differ independently year to year, not a repeated static figure", () => {
    const y2005 = populationChangeDataset.getValue("flint-mi", "population_change", { year: 2005 });
    const y2021 = populationChangeDataset.getValue("flint-mi", "population_change", { year: 2021 });
    expect(y2005).not.toBeNull();
    expect(y2021).not.toBeNull();
    expect(y2005!.value).not.toBe(y2021!.value);
  });
});
