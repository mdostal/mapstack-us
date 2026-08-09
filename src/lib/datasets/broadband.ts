import broadbandData from "@data/broadband.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The sixteenth real Dataset -- broadband access, and the first of the
 * "Census-cluster" datasets (population, income, broadband, tax,
 * housing) that sat blocked all session on a missing CENSUS_API_KEY.
 * It turns out County Health Rankings & Roadmaps already republishes
 * the exact Census ACS broadband-subscription question as its own free,
 * keyless national CSV -- the SAME source file family
 * traffic-fatalities.ts already uses for a different measure. Real ACS
 * data, without needing the blocked key at all. Extended to real
 * multi-year history (ddr-broadband-extend, this session) -- see
 * scripts/gen_broadband_data.py.
 *
 * Real multi-year history -- **2021-2025** (`supportsTime: true`). CHR
 * has published a real annual release back to 2010, but its Broadband
 * Access measure itself is a real, newer addition -- confirmed live by
 * checking every year's own real column headers directly: 2010-2020's
 * releases have no broadband measure at all, and 2021 is the real first
 * year it appears.
 *
 * Reuses the SAME city->county crosswalk hazard.ts/traffic-fatalities.ts
 * already built -- zero new geocoding.
 *
 * One layer: percent of households with a broadband internet
 * subscription of any type (cable, DSL, fiber, cell, satellite),
 * already a meaningful 0-100 quantity -- directly rescaled
 * (concern = 100 - pct), not a percentile among the 512 spine cities,
 * same posture hazard.ts/walkability.ts take with their own externally
 * meaningful scales. 512/512 real coverage across every real year --
 * the best of any dataset this project ships.
 */
interface BroadbandYear {
  pct_broadband: number;
  fallback: "state" | null;
  concern: number;
}

interface BroadbandRecord {
  county: string;
  years: Record<string, BroadbandYear>;
}

interface BroadbandMeta {
  years: number[];
}

const DATA = broadbandData as unknown as Record<string, BroadbandRecord> & { _meta: BroadbandMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getBroadbandValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "broadband_access") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const fallbackNote = yearData.fallback === "state" ? ` (${record.county} County suppressed -- showing state average)` : ` (${record.county} County)`;
  return {
    value: yearData.concern,
    detail: `${yearData.pct_broadband}% of households have a broadband subscription in ${year}${fallbackNote} -- County Health Rankings / Census ACS`,
  };
}

export const broadbandDataset: Dataset = {
  id: "broadband",
  label: "Broadband access",
  description: "Percent of households with a broadband internet subscription, 2021-2025 -- County Health Rankings, sourced from Census ACS 5-year estimates.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/broadband-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "broadband_access", label: "Broadband access", legendLow: "High subscription", legendHigh: "Low subscription" }],
  getValue: getBroadbandValue,
};
