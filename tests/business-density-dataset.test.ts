import { describe, expect, it } from "vitest";
import { businessDensityDataset } from "@/lib/datasets/business-density";
import cities from "@data/cities.json";

describe("businessDensityDataset (Dataset interface, twenty-ninth real implementation, real Census Business Patterns data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(businessDensityDataset.id).toBe("business-density");
    expect(businessDensityDataset.layers.map((l) => l.id)).toEqual(["business_density"]);
    expect(businessDensityDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rate-labeled detail for a covered city", () => {
    const result = businessDensityDataset.getValue("new-york-ny", "business_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("business establishments per 1,000 residents");
    expect(result!.detail).toContain("Census Business Patterns");
  });

  it("returns null for an unknown city id", () => {
    expect(businessDensityDataset.getValue("not-a-real-city", "business_density")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(businessDensityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (businessDensityDataset.getValue(city.id, "business_density") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
