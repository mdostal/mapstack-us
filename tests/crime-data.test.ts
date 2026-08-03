import { describe, expect, it } from "vitest";
import cities from "@data/cities.json";
import crimeData from "@data/crime.json";

type CrimeLayerData = { rate_per_100k: number; concern: number };
type CrimeYearData = { violent_crime?: CrimeLayerData; property_crime?: CrimeLayerData };
type CrimeRecord = { agency_name: string; ori: string; years: Record<string, CrimeYearData> };
type CrimeMeta = { years: number[] };

/**
 * Regenerated via scripts/fetch_crime_agencies.py + scripts/gen_crime_data.py
 * against the real FBI Crime Data Explorer API, now with real multi-year
 * history (see data/crime-methodology.md). Real, documented coverage gaps
 * exist and GROW smaller for earlier years -- these tests pin the specific
 * known-missing cities/years as a regression check, not an oversight.
 */
describe("data/crime.json integrity (multi-year)", () => {
  const cityIds = new Set(cities.map((c) => c.id));
  const records = crimeData as unknown as Record<string, CrimeRecord> & { _meta: CrimeMeta };
  const { years } = records._meta;

  it("has real, sorted years in _meta, most recent last", () => {
    expect(years.length).toBeGreaterThanOrEqual(2);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(years[years.length - 1]).toBe(2024);
  });

  it("has no orphan entries -- every key besides _meta is a real city id", () => {
    for (const key of Object.keys(records)) {
      if (key === "_meta") continue;
      expect(cityIds.has(key)).toBe(true);
    }
  });

  it("every year entry has a non-negative rate and a 0-100 concern", () => {
    for (const [key, record] of Object.entries(records)) {
      if (key === "_meta") continue;
      for (const yearData of Object.values((record as CrimeRecord).years)) {
        for (const layer of ["violent_crime", "property_crime"] as const) {
          const data = yearData[layer];
          if (!data) continue;
          expect(data.rate_per_100k).toBeGreaterThanOrEqual(0);
          expect(data.concern).toBeGreaterThanOrEqual(0);
          expect(data.concern).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("2024 covers a substantial majority of the covered city spine, not a token few", () => {
    const covered2024 = Object.entries(records).filter(
      ([key, r]) => key !== "_meta" && (r as CrimeRecord).years["2024"],
    );
    expect(covered2024.length).toBeGreaterThan(140);
  });

  it("earlier years cover the same or fewer cities than 2024 -- real reporting history grows over time, never shrinks", () => {
    const countFor = (year: number) =>
      Object.entries(records).filter(([key, r]) => key !== "_meta" && (r as CrimeRecord).years[String(year)]).length;
    for (let i = 1; i < years.length; i++) {
      expect(countFor(years[i])).toBeGreaterThanOrEqual(countFor(years[i - 1]));
    }
  });

  it("regression: known NIBRS-non-participating cities have no 2024 data, not a fabricated value", () => {
    for (const cityId of ["san-francisco-ca", "oakland-ca", "new-orleans-la"]) {
      const record = records[cityId] as CrimeRecord | undefined;
      expect(record?.years["2024"]).toBeUndefined();
    }
  });

  it("New York City has real, plausible 2024 violent and property crime data", () => {
    const nyc = records["new-york-ny"] as CrimeRecord;
    expect(nyc.agency_name).toBe("New York City Police Department");
    const y2024 = nyc.years["2024"];
    expect(y2024.violent_crime!.rate_per_100k).toBeGreaterThan(0);
    expect(y2024.property_crime!.rate_per_100k).toBeGreaterThan(0);
  });
});
