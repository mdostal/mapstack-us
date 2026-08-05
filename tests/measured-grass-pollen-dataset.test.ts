import { describe, expect, it } from "vitest";
import { measuredGrassPollenDataset } from "@/lib/datasets/measured-grass-pollen";
import cities from "@data/cities.json";

describe("measuredGrassPollenDataset (Dataset interface, twenty-first real implementation, real Carver County MN station data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(measuredGrassPollenDataset.id).toBe("measured-grass-pollen");
    expect(measuredGrassPollenDataset.layers.map((l) => l.id)).toEqual(["measured_grass_pollen"]);
    expect(measuredGrassPollenDataset.supportsTime).toBe(false);
  });

  it("returns a real, measured value with a station-labeled detail for a covered Twin Cities MN city", () => {
    const result = measuredGrassPollenDataset.getValue("minneapolis-mn", "measured_grass_pollen");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("real measured elevated-grass-pollen days/year");
    expect(result!.detail).toContain("Carver County, MN");
  });

  it("returns null for the overwhelming majority of the spine -- an honest gap, not a fabricated national estimate", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (measuredGrassPollenDataset.getValue(city.id, "measured_grass_pollen") === null) nullCount++;
    }
    // Real coverage is intentionally tiny (7/512) -- this asserts the gap
    // stays honest rather than silently growing into a fabricated default.
    expect(nullCount).toBeGreaterThan(500);
    expect(cities.length - nullCount).toBe(7);
  });

  it("returns null for an unknown city id", () => {
    expect(measuredGrassPollenDataset.getValue("not-a-real-city", "measured_grass_pollen")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(measuredGrassPollenDataset.getValue("minneapolis-mn", "not-a-real-layer")).toBeNull();
  });

  it("returns null for a city far from the real station region (e.g. New York)", () => {
    expect(measuredGrassPollenDataset.getValue("new-york-ny", "measured_grass_pollen")).toBeNull();
  });
});
