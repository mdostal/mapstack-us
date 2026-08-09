import { describe, expect, it } from "vitest";
import { schoolSpendingDataset } from "@/lib/datasets/school-spending";
import cities from "@data/cities.json";

describe("schoolSpendingDataset (Dataset interface, twenty-eighth real implementation, real NCES CCD finance data, 1994-2020)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(schoolSpendingDataset.id).toBe("school-spending");
    expect(schoolSpendingDataset.layers.map((l) => l.id)).toEqual(["per_pupil_spending"]);
    expect(schoolSpendingDataset.supportsTime).toBe(true);
    expect(schoolSpendingDataset.availableYears![0]).toBe(1994);
    expect(schoolSpendingDataset.availableYears![schoolSpendingDataset.availableYears!.length - 1]).toBe(2020);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = schoolSpendingDataset.getValue("new-york-ny", "per_pupil_spending");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("per-pupil school spending");
    expect(result!.detail).toContain("2020");
    expect(result!.detail).toContain("NCES");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    // New York's own county aggregate has no real data before 2005 (a
    // real, honest gap -- see the methodology doc); Chicago is covered
    // back to the real 1994 floor.
    const result = schoolSpendingDataset.getValue("chicago-il", "per_pupil_spending", { year: 1994 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("1994");
  });

  it("returns null for a year before the real floor (1993, zero real rows), not a fabricated value", () => {
    expect(schoolSpendingDataset.getValue("new-york-ny", "per_pupil_spending", { year: 1993 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(schoolSpendingDataset.getValue("not-a-real-city", "per_pupil_spending")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(schoolSpendingDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (schoolSpendingDataset.getValue(city.id, "per_pupil_spending") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(20);
  });

  it("returns null for the known Connecticut geography-vintage gap, at every real year", () => {
    for (const year of schoolSpendingDataset.availableYears!) {
      expect(schoolSpendingDataset.getValue("hartford-ct", "per_pupil_spending", { year })).toBeNull();
    }
  });
});
