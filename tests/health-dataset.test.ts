import { describe, expect, it } from "vitest";
import { healthDataset } from "@/lib/datasets/health";
import cities from "@data/cities.json";

describe("healthDataset (Dataset interface, seventh real implementation, place-level CDC PLACES)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(healthDataset.id).toBe("health");
    expect(healthDataset.layers.map((l) => l.id).sort()).toEqual([
      "asthma",
      "depression",
      "diabetes",
      "high_blood_pressure",
      "obesity",
    ]);
    expect(healthDataset.supportsTime).toBe(false);
  });

  it("returns a real percentage value with a place-labeled detail for a covered city", () => {
    const result = healthDataset.getValue("new-york-ny", "obesity");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(0);
    expect(result!.detail).toContain("age-adjusted prevalence");
    expect(result!.detail).toContain("CDC PLACES");
  });

  it("returns null for a city with no place-level geography, not a fabricated value", () => {
    expect(healthDataset.getValue("sundance-wy", "obesity")).toBeNull();
  });

  it("returns null for a city with confirmed no data for these measures, not a fabricated value", () => {
    // Philadelphia's PLACES rows cover a different measure subset (dental/
    // screening, not chronic-disease outcomes) in any year -- verified
    // directly against the CDC API, a real gap, not a join bug.
    expect(healthDataset.getValue("philadelphia-pa", "asthma")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(healthDataset.getValue("not-a-real-city", "obesity")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(healthDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine (a small, honest number of real gaps aside)", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (healthDataset.getValue(city.id, "obesity") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(15);
  });
});
