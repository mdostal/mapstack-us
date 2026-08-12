import { describe, expect, it } from "vitest";
import { superfundDataset } from "@/lib/datasets/superfund";
import cities from "@data/cities.json";

describe("superfundDataset (Dataset interface, thirty-fourth real implementation, real EPA Envirofacts SEMS data)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(superfundDataset.id).toBe("superfund");
    expect(superfundDataset.layers.map((l) => l.id)).toEqual(["superfund_density"]);
    expect(superfundDataset.supportsTime).toBe(false);
  });

  it("returns a 0-100 value with a site-count detail for a covered city", () => {
    const result = superfundDataset.getValue("new-york-ny", "superfund_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("active Superfund (Final NPL)");
    expect(result!.detail).toContain("EPA Envirofacts SEMS");
  });

  it("returns null for an unknown city id", () => {
    expect(superfundDataset.getValue("not-a-real-city", "superfund_density")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(superfundDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for the overwhelming majority of the spine", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (superfundDataset.getValue(city.id, "superfund_density") === null) nullCount++;
    }
    expect(nullCount).toBeLessThan(cities.length * 0.1);
  });

  it("regression: labels a Louisiana city's jurisdiction as a real Parish, not a fabricated County", () => {
    const result = superfundDataset.getValue("baton-rouge-la", "superfund_density");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("East Baton Rouge Parish");
    expect(result!.detail).not.toContain("County");
  });

  it("still labels a non-Louisiana city's jurisdiction as a County", () => {
    const result = superfundDataset.getValue("new-york-ny", "superfund_density");
    expect(result).not.toBeNull();
    expect(result!.detail).toContain("County");
  });
});
