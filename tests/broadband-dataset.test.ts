import { describe, expect, it } from "vitest";
import { broadbandDataset } from "@/lib/datasets/broadband";
import cities from "@data/cities.json";

describe("broadbandDataset (Dataset interface, sixteenth real implementation, CHR/ACS county-level data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(broadbandDataset.id).toBe("broadband");
    expect(broadbandDataset.layers.map((l) => l.id)).toEqual(["broadband_access"]);
    expect(broadbandDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a subscription-labeled detail for a covered city", () => {
    const result = broadbandDataset.getValue("new-york-ny", "broadband_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("broadband subscription");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns null for an unknown city id", () => {
    expect(broadbandDataset.getValue("not-a-real-city", "broadband_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(broadbandDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (broadbandDataset.getValue(city.id, "broadband_access") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
