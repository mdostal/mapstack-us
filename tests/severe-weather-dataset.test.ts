import { describe, expect, it } from "vitest";
import { severeWeatherDataset } from "@/lib/datasets/severe-weather";
import cities from "@data/cities.json";

describe("severeWeatherDataset (Dataset interface, thirty-seventh real implementation, real NOAA Storm Events data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(severeWeatherDataset.id).toBe("severe-weather");
    expect(severeWeatherDataset.layers.map((l) => l.id)).toEqual(["severe_weather_frequency"]);
    expect(severeWeatherDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with an event-count detail for a covered city", () => {
    const result = severeWeatherDataset.getValue("new-york-ny", "severe_weather_frequency");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("severe weather event");
    expect(result!.detail).toContain("NOAA Storm Events Database");
  });

  it("returns null for an unknown city id", () => {
    expect(severeWeatherDataset.getValue("not-a-real-city", "severe_weather_frequency")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(severeWeatherDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (severeWeatherDataset.getValue(city.id, "severe_weather_frequency") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
