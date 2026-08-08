import { describe, expect, it } from "vitest";
import { electricityCostDataset } from "@/lib/datasets/electricity-cost";
import cities from "@data/cities.json";

describe("electricityCostDataset (Dataset interface, forty-second real implementation, real EIA data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(electricityCostDataset.id).toBe("electricity-cost");
    expect(electricityCostDataset.layers.map((l) => l.id)).toEqual(["electricity_cost"]);
    expect(electricityCostDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a price-labeled detail for a covered city", () => {
    const result = electricityCostDataset.getValue("new-york-ny", "electricity_cost");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("¢/kWh");
    expect(result!.detail).toContain("EIA");
  });

  it("returns null for an unknown city id", () => {
    expect(electricityCostDataset.getValue("not-a-real-city", "electricity_cost")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(electricityCostDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
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
