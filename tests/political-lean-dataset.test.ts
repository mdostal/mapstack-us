import { describe, expect, it } from "vitest";
import { politicalLeanDataset } from "@/lib/datasets/political-lean";
import cities from "@data/cities.json";

describe("politicalLeanDataset (Dataset interface, fifteenth real implementation, real 2024 county election returns)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(politicalLeanDataset.id).toBe("political-lean");
    expect(politicalLeanDataset.layers.map((l) => l.id)).toEqual(["competitiveness"]);
    expect(politicalLeanDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a competitiveness-framed detail for a covered city", () => {
    const result = politicalLeanDataset.getValue("new-york-ny", "competitiveness");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("MIT Election Data + Science Lab");
    expect(result!.detail).toContain("not left/right lean");
  });

  it("returns null for the real Connecticut county-vintage-mismatch gap, not a fabricated value", () => {
    expect(politicalLeanDataset.getValue("hartford-ct", "competitiveness")).toBeNull();
  });

  it("returns null for an unknown city id", () => {
    expect(politicalLeanDataset.getValue("not-a-real-city", "competitiveness")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(politicalLeanDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (politicalLeanDataset.getValue(city.id, "competitiveness") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(15);
  });
});
