import { describe, expect, it } from "vitest";
import { propertyTaxDataset } from "@/lib/datasets/property-tax";
import cities from "@data/cities.json";

describe("propertyTaxDataset (Dataset interface, twenty-third real implementation, direct Census API data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(propertyTaxDataset.id).toBe("property-tax");
    expect(propertyTaxDataset.layers.map((l) => l.id)).toEqual(["property_tax_rate"]);
    expect(propertyTaxDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rate-labeled detail for a covered city", () => {
    const result = propertyTaxDataset.getValue("new-york-ny", "property_tax_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("effective property tax rate");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns null for an unknown city id", () => {
    expect(propertyTaxDataset.getValue("not-a-real-city", "property_tax_rate")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(propertyTaxDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine -- 508/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (propertyTaxDataset.getValue(city.id, "property_tax_rate") === null) nullCount++;
    }
    expect(nullCount).toBe(4);
  });

  it("returns null for the known consolidated-government gap (Louisville, KY) and the known no-crosswalk gaps", () => {
    for (const cityId of ["louisville-ky", "savannah-ga", "kenosha-wi", "sundance-wy"]) {
      expect(propertyTaxDataset.getValue(cityId, "property_tax_rate")).toBeNull();
    }
  });

  it("a well-known high-property-tax city (Trenton, NJ) scores near maximum concern", () => {
    const result = propertyTaxDataset.getValue("trenton-nj", "property_tax_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(90);
  });
});
