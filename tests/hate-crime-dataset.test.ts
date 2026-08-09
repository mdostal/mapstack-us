import { describe, expect, it } from "vitest";
import { hateCrimeDataset } from "@/lib/datasets/hate-crime";
import cities from "@data/cities.json";

describe("hateCrimeDataset (Dataset interface, thirty-third real implementation, real FBI hate crime data, 2010-2025)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(hateCrimeDataset.id).toBe("hate-crime");
    expect(hateCrimeDataset.layers.map((l) => l.id)).toEqual(["hate_crime_rate"]);
    expect(hateCrimeDataset.supportsTime).toBe(true);
    expect(hateCrimeDataset.availableYears![0]).toBe(2010);
    expect(hateCrimeDataset.availableYears![hateCrimeDataset.availableYears!.length - 1]).toBe(2025);
  });

  it("returns a 0-100 value with an incident-count detail for a covered city, defaulting to the latest year", () => {
    const result = hateCrimeDataset.getValue("new-york-ny", "hate_crime_rate");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("reported hate crime incidents");
    expect(result!.detail).toContain("2025");
    expect(result!.detail).toContain("FBI Crime Data Explorer");
  });

  it("reproduces the real, live-verified NYC 2023 incident count exactly (624)", () => {
    const result = hateCrimeDataset.getValue("new-york-ny", "hate_crime_rate", { year: 2023 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("624 reported hate crime incidents");
  });

  it("returns null for a real coverage gap (NYC before its own real NIBRS start, 2023)", () => {
    expect(hateCrimeDataset.getValue("new-york-ny", "hate_crime_rate", { year: 2020 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(hateCrimeDataset.getValue("not-a-real-city", "hate_crime_rate")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(hateCrimeDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (hateCrimeDataset.getValue(city.id, "hate_crime_rate") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(cities.length * 0.15);
  });
});
