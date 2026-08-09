import { describe, expect, it } from "vitest";
import { historicSiteDensityDataset } from "@/lib/datasets/historic-site-density";
import cities from "@data/cities.json";

describe("historicSiteDensityDataset (Dataset interface, thirty-ninth real implementation, real NPS NRHP data, 1966-2025)", () => {
  it("conforms to the Dataset interface's basic shape", () => {
    expect(historicSiteDensityDataset.id).toBe("historic-site-density");
    expect(historicSiteDensityDataset.layers.map((l) => l.id)).toEqual(["historic_site_density"]);
    expect(historicSiteDensityDataset.supportsTime).toBe(true);
    expect(historicSiteDensityDataset.availableYears![0]).toBe(1966);
    expect(historicSiteDensityDataset.availableYears![historicSiteDensityDataset.availableYears!.length - 1]).toBe(2025);
  });

  it("returns a 0-100 value with a site-count detail for a covered city, defaulting to the latest year", () => {
    const result = historicSiteDensityDataset.getValue("new-york-ny", "historic_site_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBeGreaterThanOrEqual(0);
    expect(result!.value).toBeLessThanOrEqual(100);
    expect(result!.detail).toContain("National Register of Historic Places");
    expect(result!.detail).toContain("within 10 miles");
    expect(result!.detail).toContain("2025");
  });

  it("a real site count grows (or stays flat), never shrinks, from an earlier real year to a later one", () => {
    const early = historicSiteDensityDataset.getValue("new-york-ny", "historic_site_density", { year: 1966 });
    const late = historicSiteDensityDataset.getValue("new-york-ny", "historic_site_density", { year: 2025 });
    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(late!.value).toBeLessThanOrEqual(early!.value); // more sites over time = LOWER concern
  });

  it("scores a real zero-site city at maximum concern (100)", () => {
    const result = historicSiteDensityDataset.getValue("surprise-az", "historic_site_density");
    expect(result).not.toBeNull();
    expect(result!.value).toBe(100);
    expect(result!.detail).toContain("0 National Register of Historic Places sites");
  });

  it("returns null for an unknown city id", () => {
    expect(historicSiteDensityDataset.getValue("not-a-real-city", "historic_site_density")).toBeNull();
  });

  it("returns null for an unknown layer id", () => {
    expect(historicSiteDensityDataset.getValue("new-york-ny", "not-a-real-layer")).toBeNull();
  });

  it("has a real value for every city in the spine -- 512/512 real coverage", () => {
    let nullCount = 0;
    for (const city of cities) {
      if (historicSiteDensityDataset.getValue(city.id, "historic_site_density") === null) nullCount++;
    }
    expect(nullCount).toBe(0);
  });
});
