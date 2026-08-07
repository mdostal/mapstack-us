import { describe, expect, it } from "vitest";
import { averageWageDataset } from "@/lib/datasets/average-wage";
import cities from "@data/cities.json";

describe("averageWageDataset (Dataset interface, thirty-first real implementation, real Census Business Patterns data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(averageWageDataset.id).toBe("average-wage");
    expect(averageWageDataset.layers.map((l) => l.id)).toEqual(["average_wage"]);
    expect(averageWageDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city", () => {
    const result = averageWageDataset.getValue("new-york-ny", "average_wage");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("average annual wage per employee");
    expect(result!.detail).toContain("Census Business Patterns");
  });

  it("returns null for an unknown city id", () => {
    expect(averageWageDataset.getValue("not-a-real-city", "average_wage")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(averageWageDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (averageWageDataset.getValue(city.id, "average_wage") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("a real, well-known high-wage metro (New York, NY) scores well below the midpoint (low concern)", () => {
    const result = averageWageDataset.getValue("new-york-ny", "average_wage");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
