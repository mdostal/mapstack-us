import { describe, expect, it } from "vitest";
import { droughtDataset } from "@/lib/datasets/drought";
import cities from "@data/cities.json";

describe("droughtDataset (Dataset interface, thirty-second real implementation, real US Drought Monitor data, 2000-2026)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(droughtDataset.id).toBe("drought");
    expect(droughtDataset.layers.map((l) => l.id)).toEqual(["drought_severity"]);
    expect(droughtDataset.supportsTime).toBe(true);
    expect(droughtDataset.availableYears![0]).toBe(2000);
    expect(droughtDataset.availableYears![droughtDataset.availableYears!.length - 1]).toBe(2026);
  });

  it("returns a 0-100 value with an averaged-severity detail for a covered city, defaulting to the latest year", () => {
    const result = droughtDataset.getValue("new-york-ny", "drought_severity");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("Severe Drought or worse");
    expect(result!.detail).toContain("2026");
    expect(result!.detail).toContain("US Drought Monitor");
  });

  it("an explicit earlier real year returns a real, different value than the default (latest year)", () => {
    const latest = droughtDataset.getValue("new-york-ny", "drought_severity");
    const early = droughtDataset.getValue("new-york-ny", "drought_severity", { year: 2000 });
    expect(latest).not.toBeNull();
    expect(early).not.toBeNull();
    expect(early!.detail).toContain("2000");
  });

  it("returns null for a year before the real 2000 floor", () => {
    expect(droughtDataset.getValue("new-york-ny", "drought_severity", { year: 1999 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(droughtDataset.getValue("not-a-real-city", "drought_severity")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(droughtDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (droughtDataset.getValue(city.id, "drought_severity") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
