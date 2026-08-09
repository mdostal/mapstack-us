import airQualityData from "@data/air-quality.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The twenty-fifth real Dataset -- annual county-level Air Quality Index
 * statistics, extended to real multi-year history 1980-2025 (this
 * session's unplanned "keep going" continuation). Real EPA AQS bulk
 * "Annual AQI by County" files -- no API, no key. See
 * scripts/gen_air_quality_data.py.
 *
 * This REPLACES the prior AirNow-based real-time single-day build: that
 * needed a real API key, hit AirNow's own rate limit (459/512 real
 * coverage, 53 cities lost to retries), and had no historical depth.
 * EPA AQS trades "live right now" for real official annual statistics,
 * 46 years deep, with better and more stable per-year coverage
 * (481/512 -- the remainder are genuine "no EPA AQI monitor operated in
 * this county that year" gaps, never defaulted to "Good").
 *
 * One layer: EPA's own "90th Percentile AQI" for the county-year --
 * already a concern-oriented statistic (higher = more days with degraded
 * air), direct rescale, FIXED cap per year (160) for cross-year
 * comparability.
 *
 * A real, disclosed caveat: Connecticut's 2022 county-to-planning-region
 * transition (same class of bug already documented in
 * broadband-methodology.md) means this project's own crosswalk stores CT
 * cities under their new planning-region names, but EPA AQS's own file
 * still uses the old eight counties -- CT cities fall back to a real
 * state-level average across AQS's own eight CT counties for that year,
 * disclosed in the detail text as "suppressed -- showing state average."
 */
interface AirQualityYear {
  p90_aqi: number;
  median_aqi: number;
  days_with_aqi: number | null;
  suppressed: boolean;
  score: number;
}

interface AirQualityRecord {
  county: string;
  state: string;
  years: Record<string, AirQualityYear>;
}

interface AirQualityMeta {
  years: number[];
}

const DATA = airQualityData as unknown as Record<string, AirQualityRecord> & { _meta: AirQualityMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getAirQualityValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "air_quality_index") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const suppressedNote = yearData.suppressed ? " -- suppressed -- showing state average" : "";
  return {
    value: yearData.score,
    detail: `90th percentile AQI ${yearData.p90_aqi} (median ${yearData.median_aqi}) in ${record.county} County, ${record.state} (${year})${suppressedNote} -- EPA AQS annual county summary`,
  };
}

export const airQualityDataset: Dataset = {
  id: "air-quality",
  label: "Air quality",
  description: "Real EPA AQS annual county AQI statistics, 1980-2025 -- 90th percentile AQI, higher = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/air-quality-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "air_quality_index", label: "Air Quality Index" }],
  getValue: getAirQualityValue,
};
