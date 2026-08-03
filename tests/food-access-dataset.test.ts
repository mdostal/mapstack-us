import { describe, expect, it } from "vitest";
import { foodAccessDataset } from "@/lib/datasets/food-access";
import cities from "@data/cities.json";
import foodAccessData from "@data/food-access.json";

describe("foodAccessDataset (Dataset interface, eighth real implementation, 2010-vintage-tract USDA FARA)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(foodAccessDataset.id).toBe("food-access");
    expect(foodAccessDataset.layers.map((l) => l.id).sort()).toEqual(["low_access", "low_income_low_access"]);
    expect(foodAccessDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a tract-labeled detail for a covered city", () => {
    const result = foodAccessDataset.getValue("houston-tx", "low_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("supermarket");
    expect(result!.detail).toContain("USDA ERS Food Access Research Atlas");
  });

  it("resolves Los Angeles to its real 2010-vintage tract, not the current-vintage one -- regression for the FARA vintage mismatch", () => {
    // Regression: Los Angeles' own coordinate resolves to tract "2062" under
    // the 2010 vintage (FIPS 06037211410) but "2062.02" under the current
    // (2020) vintage (FIPS 06037206202), and FARA only recognizes the
    // former -- confirms the dedicated 2010 crosswalk, not the SVI
    // dataset's current-vintage one, is what actually joined this dataset.
    // The record itself resolved (this asserts on the raw JSON, not
    // getValue(), since LA's real 2010 tract happens to itself have a null
    // share -- a genuine FARA gap, not a bug -- so getValue() alone can't
    // distinguish "no record joined" from "record joined, share is null").
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

  it("has a real value for the large majority of cities in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (foodAccessDataset.getValue(city.id, "low_access") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(50);
  });
});
