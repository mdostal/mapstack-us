import { describe, expect, it } from "vitest";
import { crimeDataset } from "@/lib/datasets/crime";

describe("crimeDataset (Dataset interface, third real implementation, now multi-year)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(crimeDataset.id).toBe("crime");
    expect(crimeDataset.layers.map((l) => l.id).sort()).toEqual(["property_crime", "violent_crime"]);
    expect(crimeDataset.supportsTime).toBe(true);
  });

  it("reports real availableYears, ending in 2024", () => {
    expect(crimeDataset.availableYears).toBeDefined();
    expect(crimeDataset.availableYears!.length).toBeGreaterThanOrEqual(2);
    expect(crimeDataset.availableYears![crimeDataset.availableYears!.length - 1]).toBe(2024);
  });

  it("defaults to the latest available year when no context is given", () => {
    const withoutContext = crimeDataset.getValue("new-york-ny", "violent_crime");
    const withLatestYear = crimeDataset.getValue("new-york-ny", "violent_crime", { year: 2024 });
    expect(withoutContext).toEqual(withLatestYear);
  });

  it("returns a 0-100 value and a year+percentile-labeled detail for a covered city/year", () => {
    const result = crimeDataset.getValue("new-york-ny", "violent_crime", { year: 2024 });
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("2024");
    expect(result!.detail).toContain("percentile");
  });

  it("returns null for a known NIBRS-non-participating city, not a fabricated value", () => {
    expect(crimeDataset.getValue("san-francisco-ca", "violent_crime", { year: 2024 })).toBeNull();
  });

  it("returns null for a year the dataset genuinely has no data for", () => {
    expect(crimeDataset.getValue("new-york-ny", "violent_crime", { year: 1990 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(crimeDataset.getValue("not-a-real-city", "violent_crime")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(crimeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });
});
