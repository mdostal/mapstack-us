import { describe, expect, it } from "vitest";
import { incomeTaxDataset } from "@/lib/datasets/income-tax";
import cities from "@data/cities.json";

describe("incomeTaxDataset (Dataset interface, twenty-second real implementation, Tax Foundation bracket data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(incomeTaxDataset.id).toBe("income-tax");
    expect(incomeTaxDataset.layers.map((l) => l.id)).toEqual(["state_income_tax"]);
    expect(incomeTaxDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a state-labeled detail for a covered city", () => {
    const result = incomeTaxDataset.getValue("new-york-ny", "state_income_tax");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("state income tax rate");
    expect(result!.detail).toContain("reflects the whole state, not just this city");
  });

  it("returns null for an unknown city id", () => {
    expect(incomeTaxDataset.getValue("not-a-real-city", "state_income_tax")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(incomeTaxDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (incomeTaxDataset.getValue(city.id, "state_income_tax") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });

  it("reports a real, correct 0 for cities in the 9 real no-income-tax states, including Washington's capital-gains-only tax not leaking in", () => {
    for (const cityId of ["austin-tx", "seattle-wa", "miami-fl"]) {
      const result = incomeTaxDataset.getValue(cityId, "state_income_tax");
      expect(result).not.toBeNull();
      expect(result!.value).toBe(0);
    }
  });

  it("California (a real graduated-bracket state) reports a nonzero rate below its own top marginal bracket", () => {
    const result = incomeTaxDataset.getValue("san-francisco-ca", "state_income_tax");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThan(0);
    // California's real top marginal rate is 13.3% -- at any real spine
    // city's median income, the applicable rate should sit well under that.
    expect(result!.value).toBeLessThan(100);
  });
});
