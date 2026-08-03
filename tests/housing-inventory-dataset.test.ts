import { describe, expect, it } from "vitest";
import { housingInventoryDataset } from "@/lib/datasets/housing-inventory";
import cities from "@data/cities.json";

describe("housingInventoryDataset (Dataset interface, ninth real implementation, direct-name-join Zillow data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(housingInventoryDataset.id).toBe("housing-inventory");
    expect(housingInventoryDataset.layers.map((l) => l.id)).toEqual(["supply_tightness"]);
    expect(housingInventoryDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a listings-labeled detail for a covered city", () => {
    const result = housingInventoryDataset.getValue("new-york-ny", "supply_tightness");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("homes for sale");
    expect(result!.detail).toContain("Zillow Research");
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

  it("has a real value for the large majority of cities in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (housingInventoryDataset.getValue(city.id, "supply_tightness") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
