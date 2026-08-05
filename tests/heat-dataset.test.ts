import { describe, expect, it } from "vitest";
import { heatDataset } from "@/lib/datasets/heat";
import cities from "@data/cities.json";

describe("heatDataset (Dataset interface, nineteenth real implementation, NOAA Climate Normals station data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(heatDataset.id).toBe("heat");
    expect(heatDataset.layers.map((l) => l.id)).toEqual(["extreme_heat_days"]);
    expect(heatDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a station-labeled detail for a covered city", () => {
    const result = heatDataset.getValue("new-york-ny", "extreme_heat_days");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("days/year above 90");
    expect(result!.detail).toContain("nearest station");
  });

  it("returns null for an unknown city id", () => {
    expect(heatDataset.getValue("not-a-real-city", "extreme_heat_days")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(heatDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512, tied with broadband for the best coverage of any dataset", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (heatDataset.getValue(city.id, "extreme_heat_days") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Yuma AZ (the hottest spine city) scores at or near maximum concern; a cold-climate city scores low", () => {
    const yuma = heatDataset.getValue("yuma-az", "extreme_heat_days");
    const minneapolis = heatDataset.getValue("minneapolis-mn", "extreme_heat_days");
    expect(yuma).not.toBeNull();
    expect(minneapolis).not.toBeNull();
    expect(yuma!.value).toBeGreaterThan(90);
    expect(yuma!.value).toBeGreaterThan(minneapolis!.value);
  });
});
