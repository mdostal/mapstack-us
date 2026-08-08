import { describe, expect, it } from "vitest";
import { propertyTaxDataset } from "@/lib/datasets/property-tax";
import cities from "@data/cities.json";

describe("propertyTaxDataset (Dataset interface, twenty-third real implementation, direct Census API data, 2010-2023)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(propertyTaxDataset.id).toBe("property-tax");
    expect(propertyTaxDataset.layers.map((l) => l.id)).toEqual(["property_tax_rate"]);
    expect(propertyTaxDataset.supportsTime).toBe(true);
    expect(propertyTaxDataset.availableYears![0]).toBe(2010);
    expect(propertyTaxDataset.availableYears![propertyTaxDataset.availableYears!.length - 1]).toBe(2023);
  });

  it("returns a 0-100 value with a rate-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = propertyTaxDataset.getValue("new-york-ny", "property_tax_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("effective property tax rate");
    expect(result!.detail).toContain("2023");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    const result = propertyTaxDataset.getValue("new-york-ny", "property_tax_rate", { year: 2010 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("2010");
  });

  it("returns null for the real floor gap (2009, before B25103 existed), not a fabricated value", () => {
    expect(propertyTaxDataset.getValue("new-york-ny", "property_tax_rate", { year: 2009 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(propertyTaxDataset.getValue("not-a-real-city", "property_tax_rate")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(propertyTaxDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (propertyTaxDataset.getValue(city.id, "property_tax_rate") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });

  it("returns null for the known no-crosswalk gaps, at every real year", () => {
    for (const cityId of ["savannah-ga", "kenosha-wi", "sundance-wy"]) {
      for (const year of propertyTaxDataset.availableYears!) {
        expect(propertyTaxDataset.getValue(cityId, "property_tax_rate", { year })).toBeNull();
      }
    }
  });

  it("a well-known high-property-tax city (Trenton, NJ) scores near maximum concern", () => {
    const result = propertyTaxDataset.getValue("trenton-nj", "property_tax_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(80);
  });
});
