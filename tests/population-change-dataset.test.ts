import { describe, expect, it } from "vitest";
import { populationChangeDataset } from "@/lib/datasets/population-change";
import cities from "@data/cities.json";

describe("populationChangeDataset (Dataset interface, twenty-sixth real implementation, direct Census API data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(populationChangeDataset.id).toBe("population-change");
    expect(populationChangeDataset.layers.map((l) => l.id)).toEqual(["population_change"]);
    expect(populationChangeDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a change-labeled detail for a covered city", () => {
    const result = populationChangeDataset.getValue("new-york-ny", "population_change");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("population");
    expect(result!.detail).toContain("Census ACS");
  });

  it("returns null for an unknown city id", () => {
    expect(populationChangeDataset.getValue("not-a-real-city", "population_change")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(populationChangeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine -- 508/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (populationChangeDataset.getValue(city.id, "population_change") === null) nullCount++;
    }
    expect(nullCount).toBe(4);
  });

  it("a real, well-known booming city (Queen Creek, AZ) scores 0 concern -- growth is not penalized", () => {
    const result = populationChangeDataset.getValue("queen-creek-az", "population_change");
    expect(result).not.toBeNull();
    expect(result!.value).toBe(0);
    expect(result!.detail).toContain("growth");
  });

  it("a real, well-known declining city (Flint, MI) scores at or near maximum concern", () => {
    const result = populationChangeDataset.getValue("flint-mi", "population_change");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(90);
    expect(result!.detail).toContain("decline");
  });
});
