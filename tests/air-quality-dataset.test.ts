import { describe, expect, it } from "vitest";
import { airQualityDataset } from "@/lib/datasets/air-quality";
import cities from "@data/cities.json";

describe("airQualityDataset (Dataset interface, twenty-fifth real implementation, real EPA AirNow data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(airQualityDataset.id).toBe("air-quality");
    expect(airQualityDataset.layers.map((l) => l.id)).toEqual(["air_quality_index"]);
    expect(airQualityDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with an AQI-labeled detail for a covered city", () => {
    const result = airQualityDataset.getValue("new-york-ny", "air_quality_index");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("AQI");
    expect(result!.detail).toContain("EPA AirNow");
  });

  it("returns null for an unknown city id", () => {
    expect(airQualityDataset.getValue("not-a-real-city", "air_quality_index")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(airQualityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has real coverage for the large majority of the spine (459/512 -- the rest a real, documented rate-limit gap)", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (airQualityDataset.getValue(city.id, "air_quality_index") === null) nullCount++;
    }
    expect(cities.length - nullCount).toBe(459);
  });
});
