import { describe, expect, it } from "vitest";
import cities from "@data/cities.json";
import crimeData from "@data/crime.json";

type CrimeLayerData = { rate_per_100k: number; concern: number };
type CrimeRecord = { agency_name: string; ori: string; violent_crime?: CrimeLayerData; property_crime?: CrimeLayerData };

/**
 * Regenerated via scripts/fetch_crime_agencies.py + scripts/gen_crime_data.py
 * against the real FBI Crime Data Explorer API (see data/crime-methodology.md).
 * Real, documented coverage gaps exist -- these tests pin the specific
 * known-missing cities as a regression check, not an oversight.
 */
describe("data/crime.json integrity", () => {
  const cityIds = new Set(cities.map((c) => c.id));
  const records = crimeData as unknown as Record<string, CrimeRecord | { description: string }>;

  it("has no orphan entries -- every key besides _meta is a real city id", () => {
    for (const key of Object.keys(records)) {
      if (key === "_meta") continue;
      expect(cityIds.has(key)).toBe(true);
    }
  });

  it("every entry with a layer has a real ori, a non-negative rate, and a 0-100 concern", () => {
    for (const [key, record] of Object.entries(records)) {
      if (key === "_meta") continue;
      const r = record as CrimeRecord;
      expect(r.ori).toBeTruthy();
      for (const layer of ["violent_crime", "property_crime"] as const) {
        const data = r[layer];
        if (!data) continue;
        expect(data.rate_per_100k).toBeGreaterThanOrEqual(0);
        expect(data.concern).toBeGreaterThanOrEqual(0);
        expect(data.concern).toBeLessThanOrEqual(100);
      }
    }
  });

  it("covers a substantial majority of the 168-city spine, not a token few", () => {
    const covered = Object.keys(records).filter((k) => k !== "_meta");
    expect(covered.length).toBeGreaterThan(140);
  });

  it("regression: known NIBRS-non-participating cities have no data, not a fabricated value", () => {
    for (const cityId of ["san-francisco-ca", "oakland-ca", "new-orleans-la"]) {
      expect(records[cityId]).toBeUndefined();
    }
  });

  it("regression: known partial-2024-coverage cities have no data, not an estimated value", () => {
    for (const cityId of ["los-angeles-ca", "phoenix-az"]) {
      expect(records[cityId]).toBeUndefined();
    }
  });

  it("New York City has real, plausible violent and property crime data", () => {
    const nyc = records["new-york-ny"] as CrimeRecord;
    expect(nyc.agency_name).toBe("New York City Police Department");
    expect(nyc.violent_crime!.rate_per_100k).toBeGreaterThan(0);
    expect(nyc.property_crime!.rate_per_100k).toBeGreaterThan(0);
  });
});
