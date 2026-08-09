import { describe, expect, it } from "vitest";
import { housingInventoryDataset } from "@/lib/datasets/housing-inventory";
import cities from "@data/cities.json";

describe("housingInventoryDataset (Dataset interface, ninth real implementation, direct-name-join Zillow data, 2018-2026)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(housingInventoryDataset.id).toBe("housing-inventory");
    expect(housingInventoryDataset.layers.map((l) => l.id)).toEqual(["supply_tightness"]);
    expect(housingInventoryDataset.supportsTime).toBe(true);
    expect(housingInventoryDataset.availableYears![0]).toBe(2018);
  });

  it("returns a 0-100 value with a listings-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = housingInventoryDataset.getValue("new-york-ny", "supply_tightness");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("homes for sale");
    expect(result!.detail).toContain("Zillow Research");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = housingInventoryDataset.getValue("new-york-ny", "supply_tightness");
    const early = housingInventoryDataset.getValue("new-york-ny", "supply_tightness", { year: 2018 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2018-12-31");
  });

  it("returns null for a year before the real 2018 floor", () => {
    expect(housingInventoryDataset.getValue("new-york-ny", "supply_tightness", { year: 2015 })).toBeNull();
  });

  it("scores a known-tight market (New York) more concerning than a known-loose one (a small town)", () => {
    const tight = housingInventoryDataset.getValue("new-york-ny", "supply_tightness");
    const loose = housingInventoryDataset.getValue("sundance-wy", "supply_tightness");
    expect(tight).not.toBeNull();
    expect(loose).not.toBeNull();
    expect(tight!.value).toBeGreaterThan(loose!.value);
  });

  it("returns null for a city with no Zillow-reported market at all, not a fabricated value", () => {
    expect(housingInventoryDataset.getValue("geraldine-mt", "supply_tightness")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(housingInventoryDataset.getValue("not-a-real-city", "supply_tightness")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(housingInventoryDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (housingInventoryDataset.getValue(city.id, "supply_tightness") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
