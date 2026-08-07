import { describe, expect, it } from "vitest";
import { winterColdBurdenDataset } from "@/lib/datasets/winter-cold-burden";
import cities from "@data/cities.json";

describe("winterColdBurdenDataset (Dataset interface, forty-first real implementation, NOAA Climate Normals station data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(winterColdBurdenDataset.id).toBe("winter-cold-burden");
    expect(winterColdBurdenDataset.layers.map((l) => l.id)).toEqual(["winter_cold_burden"]);
    expect(winterColdBurdenDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a station-labeled detail for a covered city", () => {
    const result = winterColdBurdenDataset.getValue("new-york-ny", "winter_cold_burden");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("days/year at or below 32");
    expect(result!.detail).toContain("nearest station");
    expect(result!.detail).toContain("NOAA");
  });

  it("returns null for an unknown city id", () => {
    expect(winterColdBurdenDataset.getValue("not-a-real-city", "winter_cold_burden")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(winterColdBurdenDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (winterColdBurdenDataset.getValue(city.id, "winter_cold_burden") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Flagstaff AZ (a cold-climate spine city) scores high concern; a warm-climate city scores at or near zero", () => {
    const flagstaff = winterColdBurdenDataset.getValue("flagstaff-az", "winter_cold_burden");
    const miami = winterColdBurdenDataset.getValue("miami-fl", "winter_cold_burden");
    expect(flagstaff).not.toBeNull();
    expect(miami).not.toBeNull();
    expect(flagstaff!.value).toBeGreaterThan(90);
    expect(miami!.value).toBe(0);
  });
});
