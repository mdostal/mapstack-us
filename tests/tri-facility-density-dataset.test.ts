import { describe, expect, it } from "vitest";
import { triFacilityDensityDataset } from "@/lib/datasets/tri-facility-density";
import cities from "@data/cities.json";

describe("triFacilityDensityDataset (Dataset interface, thirtieth real implementation, real EPA TRI bulk data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(triFacilityDensityDataset.id).toBe("tri-facility-density");
    expect(triFacilityDensityDataset.layers.map((l) => l.id)).toEqual(["tri_facility_density"]);
    expect(triFacilityDensityDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a facility-count detail for a covered city", () => {
    const result = triFacilityDensityDataset.getValue("new-york-ny", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("TRI-reporting facilities within 10 miles");
    expect(result!.detail).toContain("EPA Toxics Release Inventory");
  });

  it("returns null for an unknown city id", () => {
    expect(triFacilityDensityDataset.getValue("not-a-real-city", "tri_facility_density")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(triFacilityDensityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (triFacilityDensityDataset.getValue(city.id, "tri_facility_density") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real, well-known heavily-industrial city (Houston, TX) scores at or near maximum concern", () => {
    const result = triFacilityDensityDataset.getValue("houston-tx", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(90);
  });

  it("a real, well-known low-industrial city (San Francisco, CA) scores well below the midpoint", () => {
    const result = triFacilityDensityDataset.getValue("san-francisco-ca", "tri_facility_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
