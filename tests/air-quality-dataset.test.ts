import { describe, expect, it } from "vitest";
import { airQualityDataset } from "@/lib/datasets/air-quality";
import cities from "@data/cities.json";

describe("airQualityDataset (Dataset interface, twenty-fifth real implementation, real EPA AQS annual data, 1980-2025)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(airQualityDataset.id).toBe("air-quality");
    expect(airQualityDataset.layers.map((l) => l.id)).toEqual(["air_quality_index"]);
    expect(airQualityDataset.supportsTime).toBe(true);
    expect(airQualityDataset.availableYears![0]).toBe(1980);
    expect(airQualityDataset.availableYears![airQualityDataset.availableYears!.length - 1]).toBe(2025);
  });

  it("returns a 0-100 value with a 90th-percentile-AQI-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = airQualityDataset.getValue("new-york-ny", "air_quality_index");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("90th percentile AQI");
    expect(result!.detail).toContain("2025");
    expect(result!.detail).toContain("EPA AQS annual county summary");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = airQualityDataset.getValue("new-york-ny", "air_quality_index");
    const early = airQualityDataset.getValue("new-york-ny", "air_quality_index", { year: 1980 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("1980");
    expect(early!.value).not.toBe(latest!.value);
  });

  it("returns null for a year before the real 1980 floor", () => {
    expect(airQualityDataset.getValue("new-york-ny", "air_quality_index", { year: 1970 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(airQualityDataset.getValue("not-a-real-city", "air_quality_index")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(airQualityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has real coverage for the large majority of the spine at the latest year (461/512 -- the rest a real, honest no-monitor-in-that-county gap)", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (airQualityDataset.getValue(city.id, "air_quality_index") === null) nullCount++;
    }
    expect(cities.length - nullCount).toBe(461);
  });

  it("a real Connecticut city falls back to the state-level average, per Connecticut's real 2022 county-to-planning-region transition", () => {
    const result = airQualityDataset.getValue("hartford-ct", "air_quality_index");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("suppressed -- showing state average");
  });
});
