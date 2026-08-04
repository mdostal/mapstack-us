import trafficFatalitiesData from "@data/traffic-fatalities.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The eleventh real Dataset -- motor-vehicle-crash death rate, sourced from
 * County Health Rankings & Roadmaps' free, keyless national CSV (which
 * itself republishes NCHS Mortality Files / NVSS data, the same underlying
 * system FARS crash data feeds) rather than NHTSA's own FARS CrashViewer
 * API -- that API sits behind the same Akamai edge gateway that blocked
 * automated fema.gov requests earlier this session (verified: a plain curl
 * to crashviewer.nhtsa.dot.gov returns 403 "Access Denied"). See
 * scripts/gen_traffic_fatalities_data.py.
 *
 * Reuses the SAME city->county crosswalk hazard.ts's build already
 * produced -- zero new geocoding needed.
 *
 * One layer: a 7-year (2017-2023) average death rate per 100,000
 * residents, already "higher = more concerning" with no inversion needed,
 * percentile-ranked among covered cities at generation time (crime.ts's
 * convention). County-level, not city-level -- the same real "one number
 * per county" blur hazard.ts/svi.ts/food-access.ts all carry. A small
 * number of the smallest counties (too few deaths to publish safely)
 * fall back to their STATE average, explicitly recorded per-city rather
 * than silently smoothed -- see data/traffic-fatalities-methodology.md.
 */
interface TrafficFatalitiesRecord {
  rate_per_100k: number;
  deaths_2017_2023: number | null;
  county: string;
  fallback: "state" | null;
  concern: number;
}

const DATA = trafficFatalitiesData as unknown as Record<string, TrafficFatalitiesRecord> & { _meta: unknown };

function getTrafficFatalitiesValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "crash_death_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const fallbackNote = record.fallback === "state" ? ` (${record.county} County suppressed -- showing state average)` : ` (${record.county} County)`;
  return {
    value: record.concern,
    detail: `${record.rate_per_100k} motor-vehicle deaths per 100k, 2017-2023 avg${fallbackNote} -- County Health Rankings`,
  };
}

export const trafficFatalitiesDataset: Dataset = {
  id: "traffic-fatalities",
  label: "Traffic safety",
  description: "Motor-vehicle crash death rate (2017-2023 average, per 100,000 residents) -- County Health Rankings, sourced from NCHS/NVSS mortality data.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/traffic-fatalities-methodology.md",
  supportsTime: false,
  layers: [{ id: "crash_death_rate", label: "Traffic fatality rate" }],
  getValue: getTrafficFatalitiesValue,
};
