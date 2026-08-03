import { describe, expect, it } from "vitest";
import { sviDataset } from "@/lib/datasets/svi";
import cities from "@data/cities.json";
import sviData from "@data/svi.json";

describe("sviDataset (Dataset interface, sixth real implementation, tract-level CDC/ATSDR SVI)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(sviDataset.id).toBe("svi");
    expect(sviDataset.layers.map((l) => l.id).sort()).toEqual([
      "household",
      "housing_transport",
      "minority_language",
      "overall",
      "socioeconomic",
    ]);
    expect(sviDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a tract-labeled detail for a covered city", () => {
    const result = sviDataset.getValue("new-york-ny", "overall");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("percentile");
    expect(result!.detail).toContain("CDC/ATSDR SVI");
  });

  it("returns null for a real -999-suppressed tract, not a fabricated value", () => {
    const suppressedCity = Object.entries(sviData).find(
      ([id, record]) => id !== "_meta" && (record as { overall: number | null }).overall === null,
    );
    expect(suppressedCity, "expected at least one real suppressed tract in the fixture data").toBeDefined();
    const [cityId] = suppressedCity!;
    expect(sviDataset.getValue(cityId, "overall")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(sviDataset.getValue("not-a-real-city", "overall")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(sviDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for nearly every city in the spine (a small, honest number of suppressed tracts aside)", () => {
    let nullCount = 0;
    for (const city of cities) {
      const result = sviDataset.getValue(city.id, "overall");
      if (result === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
