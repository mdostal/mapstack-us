import { describe, expect, it } from "vitest";
import { triFacilityDensityDataset } from "@/lib/datasets/tri-facility-density";
import cities from "@data/cities.json";

describe("triFacilityDensityDataset (Dataset interface, thirtieth real implementation, real EPA TRI data, 1987-2024)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(triFacilityDensityDataset.id).toBe("tri-facility-density");
    expect(triFacilityDensityDataset.layers.map((l) => l.id)).toEqual(["tri_facility_density"]);
    expect(triFacilityDensityDataset.supportsTime).toBe(true);
    expect(triFacilityDensityDataset.availableYears![0]).toBe(1987);
    expect(triFacilityDensityDataset.availableYears![triFacilityDensityDataset.availableYears!.length - 1]).toBe(2024);
  });

  it("returns a 0-100 value with a facility-count detail for a covered city, defaulting to the latest year", () => {
    const result = triFacilityDensityDataset.getValue("new-york-ny", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("TRI-reporting facilities within 10 miles");
    expect(result!.detail).toContain("2024");
    expect(result!.detail).toContain("EPA Toxics Release Inventory");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = triFacilityDensityDataset.getValue("new-york-ny", "tri_facility_density");
    const early = triFacilityDensityDataset.getValue("new-york-ny", "tri_facility_density", { year: 1990 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("1990");
    expect(early!.value).not.toBe(latest!.value);
  });

  it("returns null for a year before the real 1987 reporting floor", () => {
    expect(triFacilityDensityDataset.getValue("new-york-ny", "tri_facility_density", { year: 1980 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(triFacilityDensityDataset.getValue("not-a-real-city", "tri_facility_density")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(triFacilityDensityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (triFacilityDensityDataset.getValue(city.id, "tri_facility_density") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real, well-known heavily-industrial city (Houston, TX) scores well above the midpoint", () => {
    const result = triFacilityDensityDataset.getValue("houston-tx", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(60);
  });

  it("a real, well-known low-industrial city (San Francisco, CA) scores well below the midpoint", () => {
    const result = triFacilityDensityDataset.getValue("san-francisco-ca", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
