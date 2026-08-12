import { describe, expect, it } from "vitest";
import { severeWeatherDataset } from "@/lib/datasets/severe-weather";
import cities from "@data/cities.json";

describe("severeWeatherDataset (Dataset interface, thirty-seventh real implementation, real NOAA Storm Events data, 1950-2026)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(severeWeatherDataset.id).toBe("severe-weather");
    expect(severeWeatherDataset.layers.map((l) => l.id)).toEqual(["severe_weather_frequency"]);
    expect(severeWeatherDataset.supportsTime).toBe(true);
    expect(severeWeatherDataset.availableYears![0]).toBe(1950);
    expect(severeWeatherDataset.availableYears![severeWeatherDataset.availableYears!.length - 1]).toBe(2026);
  });

  it("returns a 0-100 value with an event-count detail for a covered city, defaulting to the latest year", () => {
    const result = severeWeatherDataset.getValue("new-york-ny", "severe_weather_frequency");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("severe weather event");
    expect(result!.detail).toContain("2026");
    expect(result!.detail).toContain("NOAA Storm Events Database");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = severeWeatherDataset.getValue("new-york-ny", "severe_weather_frequency");
    const early = severeWeatherDataset.getValue("new-york-ny", "severe_weather_frequency", { year: 1950 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("1950");
  });

  it("returns null for a year before the real 1950 floor", () => {
    expect(severeWeatherDataset.getValue("new-york-ny", "severe_weather_frequency", { year: 1940 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(severeWeatherDataset.getValue("not-a-real-city", "severe_weather_frequency")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(severeWeatherDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (severeWeatherDataset.getValue(city.id, "severe_weather_frequency") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("discloses when the current (in-progress) real year is genuinely partial, so a low count doesn't read as risk-free", () => {
    // Real bug found live by this project's own QA sweep: an undisclosed
    // 0-event 2026 reading for AZ/NV (whose real severe-weather season is
    // monsoon-driven, June-September -- not yet covered by NOAA's current
    // partial-year file) looked like a confident "risk-free" score.
    const partial = severeWeatherDataset.getValue("phoenix-az", "severe_weather_frequency", { year: 2026 });
    expect(partial).not.toBeNull();
    expect(partial!.detail).toContain("not a complete year");
  });

  it("does not append the partial-year note to a real, fully-completed year", () => {
    const complete = severeWeatherDataset.getValue("phoenix-az", "severe_weather_frequency", { year: 2025 });
    expect(complete).not.toBeNull();
    expect(complete!.detail).not.toContain("not a complete year");
  });
});
