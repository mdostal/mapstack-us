import broadbandData from "@data/broadband.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The sixteenth real Dataset -- broadband access, and the first of the
 * "Census-cluster" datasets (population, income, broadband, tax,
 * housing) that sat blocked all session on a missing CENSUS_API_KEY.
 * It turns out County Health Rankings & Roadmaps already republishes
 * the exact Census ACS broadband-subscription question as its own free,
 * keyless national CSV -- the SAME source file
 * traffic-fatalities.ts already uses for a different measure. Real ACS
 * data, without needing the blocked key at all. See
 * scripts/gen_broadband_data.py.
 *
 * Reuses the SAME city->county crosswalk hazard.ts/traffic-fatalities.ts
 * already built -- zero new geocoding.
 *
 * One layer: percent of households with a broadband internet
 * subscription of any type (cable, DSL, fiber, cell, satellite),
 * already a meaningful 0-100 quantity -- directly rescaled
 * (concern = 100 - pct), not a percentile among the 512 spine cities,
 * same posture hazard.ts/walkability.ts take with their own externally
 * meaningful scales. 512/512 real coverage -- the best of any dataset
 * this project ships.
 */
interface BroadbandRecord {
  pct_broadband: number;
  county: string;
  fallback: "state" | null;
  concern: number;
}

const DATA = broadbandData as unknown as Record<string, BroadbandRecord> & { _meta: unknown };

function getBroadbandValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "broadband_access") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const fallbackNote = record.fallback === "state" ? ` (${record.county} County suppressed -- showing state average)` : ` (${record.county} County)`;
  return {
    value: record.concern,
    detail: `${record.pct_broadband}% of households have a broadband subscription${fallbackNote} -- County Health Rankings / Census ACS`,
  };
}

export const broadbandDataset: Dataset = {
  id: "broadband",
  label: "Broadband access",
  description: "Percent of households with a broadband internet subscription -- County Health Rankings, sourced from Census ACS 5-year estimates.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/broadband-methodology.md",
  supportsTime: false,
  layers: [{ id: "broadband_access", label: "Broadband access", legendLow: "High subscription", legendHigh: "Low subscription" }],
  getValue: getBroadbandValue,
};
