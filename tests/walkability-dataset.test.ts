import { describe, expect, it } from "vitest";
import { walkabilityDataset } from "@/lib/datasets/walkability";
import cities from "@data/cities.json";

describe("walkabilityDataset (Dataset interface, thirteenth real implementation, hosted-FeatureServer point query)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(walkabilityDataset.id).toBe("walkability");
    expect(walkabilityDataset.layers.map((l) => l.id)).toEqual(["walkability"]);
    expect(walkabilityDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with an EPA-labeled detail for a covered city", () => {
    const result = walkabilityDataset.getValue("new-york-ny", "walkability");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("National Walkability Index");
    expect(result!.detail).toContain("EPA Smart Location Database");
  });

  it("returns null for an unknown city id", () => {
    expect(walkabilityDataset.getValue("not-a-real-city", "walkability")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(walkabilityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for essentially every city in the spine -- EPA's Smart Location Database covers all block groups nationally", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (walkabilityDataset.getValue(city.id, "walkability") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(5);
  });
});
