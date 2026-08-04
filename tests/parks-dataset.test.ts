import { describe, expect, it } from "vitest";
import { parksDataset } from "@/lib/datasets/parks";
import cities from "@data/cities.json";

describe("parksDataset (Dataset interface, fourteenth real implementation, hosted-FeatureServer point query)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(parksDataset.id).toBe("parks");
    expect(parksDataset.layers.map((l) => l.id)).toEqual(["park_access"]);
    expect(parksDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a TPL-labeled detail for a covered city", () => {
    const result = parksDataset.getValue("new-york-ny", "park_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("10-min walk");
    expect(result!.detail).toContain("Trust for Public Land");
  });

  it("scores a well-served city (New York) less concerning than a real lower-access one", () => {
    const nyc = parksDataset.getValue("new-york-ny", "park_access");
    const lowerAccess = parksDataset.getValue("charleston-sc", "park_access");
    expect(nyc).not.toBeNull();
    expect(lowerAccess).not.toBeNull();
    expect(nyc!.value).toBeLessThan(lowerAccess!.value);
  });

  it("returns null for a real gap with no ParkServe place match, not a fabricated value", () => {
    expect(parksDataset.getValue("sundance-wy", "park_access")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(parksDataset.getValue("not-a-real-city", "park_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(parksDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for essentially every city in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (parksDataset.getValue(city.id, "park_access") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
