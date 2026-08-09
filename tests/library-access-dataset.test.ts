import { describe, expect, it } from "vitest";
import { libraryAccessDataset } from "@/lib/datasets/library-access";
import cities from "@data/cities.json";

describe("libraryAccessDataset (Dataset interface, thirty-sixth real implementation, real IMLS PLS data, 2007-2024)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(libraryAccessDataset.id).toBe("library-access");
    expect(libraryAccessDataset.layers.map((l) => l.id)).toEqual(["library_access"]);
    expect(libraryAccessDataset.supportsTime).toBe(true);
    expect(libraryAccessDataset.availableYears![0]).toBe(2007);
    expect(libraryAccessDataset.availableYears![libraryAccessDataset.availableYears!.length - 1]).toBe(2024);
  });

  it("returns a 0-100 value with a visits-per-capita detail for a covered city, defaulting to the latest year", () => {
    const result = libraryAccessDataset.getValue("new-york-ny", "library_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("library visits per resident per year");
    expect(result!.detail).toContain("2024");
    expect(result!.detail).toContain("IMLS Public Libraries Survey");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = libraryAccessDataset.getValue("new-york-ny", "library_access");
    const early = libraryAccessDataset.getValue("new-york-ny", "library_access", { year: 2007 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2007");
    expect(early!.value).not.toBe(latest!.value);
  });

  it("returns null for a year before the real 2007 coordinate-data floor", () => {
    expect(libraryAccessDataset.getValue("new-york-ny", "library_access", { year: 2000 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(libraryAccessDataset.getValue("not-a-real-city", "library_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(libraryAccessDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (libraryAccessDataset.getValue(city.id, "library_access") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(cities.length * 0.1);
  });
});
