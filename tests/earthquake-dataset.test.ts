import { describe, expect, it } from "vitest";
import { earthquakeDataset } from "@/lib/datasets/earthquake";
import cities from "@data/cities.json";

describe("earthquakeDataset (Dataset interface, thirty-fifth real implementation, real USGS ASCE 7-22 data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(earthquakeDataset.id).toBe("earthquake");
    expect(earthquakeDataset.layers.map((l) => l.id)).toEqual(["seismic_risk"]);
    expect(earthquakeDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a design-spectral-acceleration detail for a covered city", () => {
    const result = earthquakeDataset.getValue("new-york-ny", "seismic_risk");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("g design spectral acceleration");
    expect(result!.detail).toContain("USGS ASCE 7-22");
  });

  it("returns null for an unknown city id", () => {
    expect(earthquakeDataset.getValue("not-a-real-city", "seismic_risk")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(earthquakeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (earthquakeDataset.getValue(city.id, "seismic_risk") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real, well-known high-seismic-risk city (Los Angeles, CA) scores at or near maximum concern", () => {
    const result = earthquakeDataset.getValue("los-angeles-ca", "seismic_risk");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(90);
  });

  it("a real, well-known low-seismic-risk city (New York, NY) scores well below the midpoint", () => {
    const result = earthquakeDataset.getValue("new-york-ny", "seismic_risk");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
