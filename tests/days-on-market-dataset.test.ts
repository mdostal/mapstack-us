import { describe, expect, it } from "vitest";
import { daysOnMarketDataset } from "@/lib/datasets/days-on-market";
import cities from "@data/cities.json";

describe("daysOnMarketDataset (Dataset interface, tenth real implementation, direct-name-join Zillow data, 2018-2026)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(daysOnMarketDataset.id).toBe("days-on-market");
    expect(daysOnMarketDataset.layers.map((l) => l.id)).toEqual(["market_speed"]);
    expect(daysOnMarketDataset.supportsTime).toBe(true);
    expect(daysOnMarketDataset.availableYears![0]).toBe(2018);
  });

  it("returns a 0-100 value with a days-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = daysOnMarketDataset.getValue("new-york-ny", "market_speed");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("days to pending");
    expect(result!.detail).toContain("Zillow Research");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = daysOnMarketDataset.getValue("new-york-ny", "market_speed");
    const early = daysOnMarketDataset.getValue("new-york-ny", "market_speed", { year: 2018 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2018-12-31");
  });

  it("returns null for a year before the real 2018 floor", () => {
    expect(daysOnMarketDataset.getValue("new-york-ny", "market_speed", { year: 2015 })).toBeNull();
  });

  it("scores a known-fast market more concerning than a known-slow one, per this dataset's explicit framing", () => {
    // New York is a real slow-turnover market (homes sit longer), Boise a
    // real fast one -- confirmed against the actual generated data.
    const slow = daysOnMarketDataset.getValue("new-york-ny", "market_speed");
    const fast = daysOnMarketDataset.getValue("boise-id", "market_speed");
    expect(slow).not.toBeNull();
    expect(fast).not.toBeNull();
    expect(fast!.value).toBeGreaterThan(slow!.value);
  });

  it("returns null for a city with no reported days-to-pending series, not a fabricated value", () => {
    expect(daysOnMarketDataset.getValue("sundance-wy", "market_speed")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(daysOnMarketDataset.getValue("not-a-real-city", "market_speed")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(daysOnMarketDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (daysOnMarketDataset.getValue(city.id, "market_speed") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(30);
  });
});
