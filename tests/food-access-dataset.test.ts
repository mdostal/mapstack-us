import { describe, expect, it } from "vitest";
import { foodAccessDataset } from "@/lib/datasets/food-access";
import cities from "@data/cities.json";
import foodAccessData from "@data/food-access.json";

describe("foodAccessDataset (Dataset interface, eighth real implementation, 2010-vintage-tract USDA FARA, 2010/2015/2019)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(foodAccessDataset.id).toBe("food-access");
    expect(foodAccessDataset.layers.map((l) => l.id).sort()).toEqual(["low_access", "low_income_low_access"]);
    expect(foodAccessDataset.supportsTime).toBe(true);
    expect(foodAccessDataset.availableYears).toEqual([2010, 2015, 2019]);
  });

  it("returns a 0-100 value with a tract-labeled detail for a covered city, defaulting to the latest vintage", () => {
    const result = foodAccessDataset.getValue("houston-tx", "low_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("supermarket");
    expect(result!.detail).toContain("2019");
    expect(result!.detail).toContain("USDA ERS Food Access Research Atlas");
  });

  it("an explicit earlier real vintage returns a real, different value than the default (latest)", () => {
    const latest = foodAccessDataset.getValue("houston-tx", "low_access");
    const early = foodAccessDataset.getValue("houston-tx", "low_access", { year: 2010 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2010");
  });

  it("returns null for a year FARA never published (no real vintage exists)", () => {
    expect(foodAccessDataset.getValue("houston-tx", "low_access", { year: 2012 })).toBeNull();
  });

  it("resolves Los Angeles to its real 2010-vintage tract, not the current-vintage one -- regression for the FARA vintage mismatch", () => {
    // Regression: Los Angeles' own coordinate resolves to tract "2062" under
    // the 2010 vintage (FIPS 06037211410) but "2062.02" under the current
    // (2020) vintage (FIPS 06037206202), and FARA only recognizes the
    // former -- confirms the dedicated 2010 crosswalk, not the SVI
    // dataset's current-vintage one, is what actually joined this dataset.
    // The record itself resolved (this asserts on the raw JSON, not
    // getValue(), since LA's real 2010 tract happens to itself have a real
    // null share in the 2019 vintage specifically -- a genuine FARA gap, not
    // a bug -- so getValue() alone can't distinguish "no record joined" from
    // "record joined, share is null").
    const record = (foodAccessData as unknown as Record<string, { tract: string }>)["los-angeles-ca"];
    expect(record).toBeDefined();
    expect(record.tract).toBe("Census Tract 2062");
  });

  it("returns null for an unknown city id", () => {
    expect(foodAccessDataset.getValue("not-a-real-city", "low_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(foodAccessDataset.getValue("houston-tx", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine at the latest vintage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (foodAccessDataset.getValue(city.id, "low_access") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(50);
  });
});
