import { describe, expect, it } from "vitest";
import { careAccessDataset } from "@/lib/datasets/care-access";
import cities from "@data/cities.json";

describe("careAccessDataset (Dataset interface, fourth real implementation, ported from allergy-locator)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(careAccessDataset.id).toBe("care-access");
    expect(careAccessDataset.layers.map((l) => l.id).sort()).toEqual([
      "general",
      "pediatric_cardiac",
      "pediatric_specialty",
    ]);
    expect(careAccessDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value and a facility+drive-time detail for a covered city", () => {
    const result = careAccessDataset.getValue("new-york-ny", "general");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.tier).toBeDefined();
    expect(result!.detail).toMatch(/drive/);
  });

  it("flags the over-water haversine outliers (Honolulu, Anchorage) explicitly in the detail", () => {
    const honolulu = careAccessDataset.getValue("honolulu-hi", "pediatric_cardiac");
    expect(honolulu).not.toBeNull();
    expect(honolulu!.value).toBe(100);
    expect(honolulu!.detail).toContain("open water");

    const anchorage = careAccessDataset.getValue("anchorage-ak", "pediatric_cardiac");
    expect(anchorage).not.toBeNull();
    expect(anchorage!.value).toBe(100);
    expect(anchorage!.detail).toContain("open water");
  });

  it("does not flag a normal, real long rural drive with the over-water caveat", () => {
    const result = careAccessDataset.getValue("billings-mt", "pediatric_cardiac");
    expect(result).not.toBeNull();
    expect(result!.detail).not.toContain("open water");
  });

  it("returns null for an unknown city id", () => {
    expect(careAccessDataset.getValue("not-a-real-city", "general")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(careAccessDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("every spine city has a value for every layer -- care-access is computed (haversine + a fixed facility list), not source-limited, so it covers the full spine unlike allergy/crime", () => {
    for (const city of cities) {
      for (const layer of careAccessDataset.layers) {
        const result = careAccessDataset.getValue(city.id, layer.id);
        expect(result, `${city.id} / ${layer.id}`).not.toBeNull();
      }
    }
  });
});
