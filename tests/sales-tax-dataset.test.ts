import { describe, expect, it } from "vitest";
import { salesTaxDataset } from "@/lib/datasets/sales-tax";
import cities from "@data/cities.json";

describe("salesTaxDataset (Dataset interface, twentieth real implementation, Tax Foundation two-tier data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(salesTaxDataset.id).toBe("sales-tax");
    expect(salesTaxDataset.layers.map((l) => l.id)).toEqual(["combined_sales_tax"]);
    expect(salesTaxDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a rate-labeled detail for a city with its own city-tier rate", () => {
    const result = salesTaxDataset.getValue("seattle-wa", "combined_sales_tax");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("combined state + local sales tax");
    expect(result!.detail).toContain("city rate");
  });

  it("labels a state-tier fallback city's detail as a state average, not a city-specific rate", () => {
    // Small towns below the 200k-population city-tier threshold fall back
    // to their state's average rate -- Sundance WY is far too small to
    // have its own Tax Foundation city-level row.
    const result = salesTaxDataset.getValue("sundance-wy", "combined_sales_tax");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("state average rate");
    expect(result!.detail).toContain("no city-specific rate published");
  });

  it("returns null for an unknown city id", () => {
    expect(salesTaxDataset.getValue("not-a-real-city", "combined_sales_tax")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(salesTaxDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512, tied with broadband/heat for the best coverage of any dataset", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (salesTaxDataset.getValue(city.id, "combined_sales_tax") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Oregon (no sales tax at all) reports a real, honest 0, not a fabricated value", () => {
    const result = salesTaxDataset.getValue("portland-or", "combined_sales_tax");
    expect(result).not.toBeNull();
    expect(result!.value).toBe(0);
    expect(result!.detail).toContain("0% combined");
  });
});
