import { describe, expect, it } from "vitest";
import { crimeDataset } from "@/lib/datasets/crime";

describe("crimeDataset (Dataset interface, third real implementation)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(crimeDataset.id).toBe("crime");
    expect(crimeDataset.layers.map((l) => l.id).sort()).toEqual(["property_crime", "violent_crime"]);
    expect(crimeDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value and a percentile-labeled detail for a covered city", () => {
    const result = crimeDataset.getValue("new-york-ny", "violent_crime");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("percentile");
    expect(result!.detail).toContain("100k");
  });

  it("returns null for a known NIBRS-non-participating city, not a fabricated value", () => {
    expect(crimeDataset.getValue("san-francisco-ca", "violent_crime")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(crimeDataset.getValue("not-a-real-city", "violent_crime")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(crimeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });
});
