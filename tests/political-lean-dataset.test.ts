import { describe, expect, it } from "vitest";
import { politicalLeanDataset } from "@/lib/datasets/political-lean";
import cities from "@data/cities.json";

describe("politicalLeanDataset (Dataset interface, fifteenth real implementation, real county election returns 2000-2024)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(politicalLeanDataset.id).toBe("political-lean");
    expect(politicalLeanDataset.layers.map((l) => l.id)).toEqual(["competitiveness"]);
    expect(politicalLeanDataset.supportsTime).toBe(true);
    expect(politicalLeanDataset.availableYears).toEqual([2000, 2004, 2008, 2012, 2016, 2020, 2024]);
  });

  it("defaults to the latest real cycle (2024) with no context", () => {
    const result = politicalLeanDataset.getValue("new-york-ny", "competitiveness");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("2024");
  });

  it("returns a 0-100 value with a competitiveness-framed detail for a covered city", () => {
    const result = politicalLeanDataset.getValue("new-york-ny", "competitiveness", { year: 2024 });
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("MIT Election Data + Science Lab");
    expect(result!.detail).toContain("not left/right lean");
  });

  it("returns real, independently-computed values for earlier real cycles too", () => {
    const y2000 = politicalLeanDataset.getValue("chicago-il", "competitiveness", { year: 2000 });
    const y2024 = politicalLeanDataset.getValue("chicago-il", "competitiveness", { year: 2024 });
    expect(y2000).not.toBeNull();
    expect(y2024).not.toBeNull();
    expect(y2000!.detail).toContain("2000");
    expect(y2024!.detail).toContain("2024");
  });

  it("returns null for a real off-cycle year (no election that year), not a fabricated value", () => {
    expect(politicalLeanDataset.getValue("new-york-ny", "competitiveness", { year: 2022 })).toBeNull();
  });

  it("returns null for the real Connecticut county-vintage-mismatch gap, at every real cycle", () => {
    for (const year of politicalLeanDataset.availableYears!) {
      expect(politicalLeanDataset.getValue("hartford-ct", "competitiveness", { year })).toBeNull();
    }
  });

  it("returns null for an unknown city id", () => {
    expect(politicalLeanDataset.getValue("not-a-real-city", "competitiveness")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(politicalLeanDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the large majority of cities in the spine, at the latest cycle", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (politicalLeanDataset.getValue(city.id, "competitiveness") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(15);
  });

  it("regression: never reports MEDSL's own 'TOTAL VOTES CAST' aggregate row as a winning candidate", () => {
    // Real bug found live by this project's own QA sweep: Wisconsin's and
    // South Carolina's 2024 MEDSL rows are all tagged with a blank `mode`
    // (no separate "TOTAL" marker), so the aggregate "TOTAL VOTES CAST"
    // pseudo-candidate row -- whose vote count equals the whole county's
    // total -- silently out-"voted" every real candidate. See
    // data/political-lean-methodology.md's Method section, step 3.
    const affected2024 = ["milwaukee-wi", "madison-wi", "green-bay-wi", "kenosha-wi", "charleston-sc", "columbia-sc"];
    for (const cityId of affected2024) {
      const result = politicalLeanDataset.getValue(cityId, "competitiveness", { year: 2024 });
      expect(result).not.toBeNull();
      expect(result!.detail).not.toContain("Total Votes Cast");
    }
  });
});
