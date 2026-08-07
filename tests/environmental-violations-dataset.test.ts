import { describe, expect, it } from "vitest";
import { environmentalViolationsDataset } from "@/lib/datasets/environmental-violations";
import cities from "@data/cities.json";

describe("environmentalViolationsDataset (Dataset interface, fortieth real implementation, real EPA ECHO data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(environmentalViolationsDataset.id).toBe("environmental-violations");
    expect(environmentalViolationsDataset.layers.map((l) => l.id)).toEqual(["environmental_violations"]);
    expect(environmentalViolationsDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a violation-count detail for a covered city", () => {
    const result = environmentalViolationsDataset.getValue("new-york-ny", "environmental_violations");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("significant violation");
    expect(result!.detail).toContain("EPA ECHO");
  });

  it("scores a real zero-violation city at minimum concern (0)", () => {
    const result = environmentalViolationsDataset.getValue("bend-or", "environmental_violations");
    expect(result).not.toBeNull();
    expect(result!.value).toBe(0);
    expect(result!.detail).toContain("0 facilities in significant violation");
  });

  it("returns null for an unknown city id", () => {
    expect(environmentalViolationsDataset.getValue("not-a-real-city", "environmental_violations")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(environmentalViolationsDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (environmentalViolationsDataset.getValue(city.id, "environmental_violations") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
