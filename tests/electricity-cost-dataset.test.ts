import { describe, expect, it } from "vitest";
import { electricityCostDataset } from "@/lib/datasets/electricity-cost";
import cities from "@data/cities.json";

describe("electricityCostDataset (Dataset interface, forty-second real implementation, real EIA data, 2001-2025)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(electricityCostDataset.id).toBe("electricity-cost");
    expect(electricityCostDataset.layers.map((l) => l.id)).toEqual(["electricity_cost"]);
    expect(electricityCostDataset.supportsTime).toBe(true);
    expect(electricityCostDataset.availableYears![0]).toBe(2001);
    expect(electricityCostDataset.availableYears![electricityCostDataset.availableYears!.length - 1]).toBe(2025);
  });

  it("returns a 0-100 value with a price-labeled detail for a covered city, defaulting to the latest year", () => {
    const result = electricityCostDataset.getValue("new-york-ny", "electricity_cost");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("¢/kWh");
    expect(result!.detail).toContain("2025");
    expect(result!.detail).toContain("EIA");
  });

  it("returns real, independently-computed values for an earlier real year too", () => {
    const result = electricityCostDataset.getValue("new-york-ny", "electricity_cost", { year: 2001 });
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("2001");
  });

  it("returns null for a year before the real floor, not a fabricated value", () => {
    expect(electricityCostDataset.getValue("new-york-ny", "electricity_cost", { year: 2000 })).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(electricityCostDataset.getValue("not-a-real-city", "electricity_cost")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(electricityCostDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine at the latest year -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (electricityCostDataset.getValue(city.id, "electricity_cost") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("Hawaii (the most expensive real state) scores high concern; a cheap state scores low", () => {
    const honolulu = electricityCostDataset.getValue("honolulu-hi", "electricity_cost");
    const fargo = electricityCostDataset.getValue("fargo-nd", "electricity_cost");
    expect(honolulu).not.toBeNull();
    expect(fargo).not.toBeNull();
    expect(honolulu!.value).toBeGreaterThan(fargo!.value);
  });
});
