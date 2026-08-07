import { describe, expect, it } from "vitest";
import { droughtDataset } from "@/lib/datasets/drought";
import cities from "@data/cities.json";

describe("droughtDataset (Dataset interface, thirty-second real implementation, real US Drought Monitor data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(droughtDataset.id).toBe("drought");
    expect(droughtDataset.layers.map((l) => l.id)).toEqual(["drought_severity"]);
    expect(droughtDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a date-stamped detail for a covered city", () => {
    const result = droughtDataset.getValue("new-york-ny", "drought_severity");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("Severe Drought or worse");
    expect(result!.detail).toContain("US Drought Monitor");
  });

  it("returns null for an unknown city id", () => {
    expect(droughtDataset.getValue("not-a-real-city", "drought_severity")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(droughtDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (droughtDataset.getValue(city.id, "drought_severity") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
