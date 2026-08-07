import { describe, expect, it } from "vitest";
import { libraryAccessDataset } from "@/lib/datasets/library-access";
import cities from "@data/cities.json";

describe("libraryAccessDataset (Dataset interface, thirty-sixth real implementation, real IMLS PLS data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(libraryAccessDataset.id).toBe("library-access");
    expect(libraryAccessDataset.layers.map((l) => l.id)).toEqual(["library_access"]);
    expect(libraryAccessDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a visits-per-capita detail for a covered city", () => {
    const result = libraryAccessDataset.getValue("new-york-ny", "library_access");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("library visits per resident per year");
    expect(result!.detail).toContain("IMLS Public Libraries Survey");
  });

  it("returns null for an unknown city id", () => {
    expect(libraryAccessDataset.getValue("not-a-real-city", "library_access")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(libraryAccessDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (libraryAccessDataset.getValue(city.id, "library_access") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(cities.length * 0.1);
  });
});
