import { describe, expect, it } from "vitest";
import { schoolSpendingDataset } from "@/lib/datasets/school-spending";
import cities from "@data/cities.json";

describe("schoolSpendingDataset (Dataset interface, twenty-eighth real implementation, real NCES CCD finance data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(schoolSpendingDataset.id).toBe("school-spending");
    expect(schoolSpendingDataset.layers.map((l) => l.id)).toEqual(["per_pupil_spending"]);
    expect(schoolSpendingDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city", () => {
    const result = schoolSpendingDataset.getValue("new-york-ny", "per_pupil_spending");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("per-pupil school spending");
    expect(result!.detail).toContain("NCES");
  });

  it("returns null for an unknown city id", () => {
    expect(schoolSpendingDataset.getValue("not-a-real-city", "per_pupil_spending")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(schoolSpendingDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for 504/512 cities -- the 8 gaps are a real CT planning-region/Broomfield geography-vintage mismatch, not a bug", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (schoolSpendingDataset.getValue(city.id, "per_pupil_spending") === null) nullCount++;
    }
    expect(nullCount).toBe(8);
  });

  it("returns null for the known Connecticut geography-vintage gap, not a fabricated value", () => {
    expect(schoolSpendingDataset.getValue("hartford-ct", "per_pupil_spending")).toBeNull();
  });
});
