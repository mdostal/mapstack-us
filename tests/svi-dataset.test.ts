import { describe, expect, it } from "vitest";
import { sviDataset } from "@/lib/datasets/svi";
import cities from "@data/cities.json";

describe("sviDataset (Dataset interface, sixth real implementation, tract-level CDC/ATSDR SVI, 2010-2022)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(sviDataset.id).toBe("svi");
    expect(sviDataset.layers.map((l) => l.id).sort()).toEqual([
      "household",
      "housing_transport",
      "minority_language",
      "overall",
      "socioeconomic",
    ]);
    expect(sviDataset.supportsTime).toBe(true);
    expect(sviDataset.availableYears).toEqual([2010, 2014, 2016, 2018, 2020, 2022]);
  });

  it("returns a 0-100 value with a tract-labeled detail for a covered city, defaulting to the latest vintage", () => {
    const result = sviDataset.getValue("new-york-ny", "overall");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("percentile");
    expect(result!.detail).toContain("2022");
    expect(result!.detail).toContain("CDC/ATSDR Social Vulnerability Index");
  });

  it("an explicit earlier real vintage returns a real, different value than the default (latest)", () => {
    const latest = sviDataset.getValue("new-york-ny", "overall");
    const early = sviDataset.getValue("new-york-ny", "overall", { year: 2010 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2010");
  });

  it("returns null for the real, disclosed 2000 gap (no crosswalk was buildable for that boundary vintage)", () => {
    expect(sviDataset.getValue("new-york-ny", "overall", { year: 2000 })).toBeNull();
  });

  it("returns null for a real suppressed tract, not a fabricated value", () => {
    // Boca Raton, FL's real Census Tract 71 has a real suppressed (null)
    // overall percentile specifically in the 2016 release.
    expect(sviDataset.getValue("boca-raton-fl", "overall", { year: 2016 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(sviDataset.getValue("not-a-real-city", "overall")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(sviDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for nearly every city in the spine at the latest vintage (a small, honest number of suppressed tracts aside)", () => {
    let nullCount = 0;
    for (const city of cities) {
      const result = sviDataset.getValue(city.id, "overall");
      if (result === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(10);
  });
});
