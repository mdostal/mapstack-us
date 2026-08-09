import { describe, expect, it } from "vitest";
import { averageWageDataset } from "@/lib/datasets/average-wage";
import cities from "@data/cities.json";

describe("averageWageDataset (Dataset interface, thirty-first real implementation, real Census Business Patterns data, 1986-2023)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(averageWageDataset.id).toBe("average-wage");
    expect(averageWageDataset.layers.map((l) => l.id)).toEqual(["average_wage"]);
    expect(averageWageDataset.supportsTime).toBe(true);
    expect(averageWageDataset.availableYears![0]).toBe(1986);
    expect(averageWageDataset.availableYears![averageWageDataset.availableYears!.length - 1]).toBe(2023);
  });

  it("returns a 0-100 value with a dollar-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = averageWageDataset.getValue("new-york-ny", "average_wage");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("average annual wage per employee");
    expect(result!.detail).toContain("2023");
    expect(result!.detail).toContain("Census Business Patterns");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    const result = averageWageDataset.getValue("new-york-ny", "average_wage", { year: 1986 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("1986");
  });

  it("returns null for a year before CBP's real floor, not a fabricated value", () => {
    expect(averageWageDataset.getValue("new-york-ny", "average_wage", { year: 1985 })).toBeNull();
  });

  it("returns null for the real release-lag gap (2024, not yet published)", () => {
    expect(averageWageDataset.getValue("new-york-ny", "average_wage", { year: 2024 })).toBeNull();
  });

  it("has a real value for the large majority of the spine at the latest year", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (averageWageDataset.getValue(city.id, "average_wage") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(20);
  });

  it("a real, well-known high-wage metro (New York, NY) scores well below the midpoint (low concern)", () => {
    const result = averageWageDataset.getValue("new-york-ny", "average_wage");
    expect(result).not.toBeNull();
    expect(result!.value).toBeLessThan(25);
  });
});
