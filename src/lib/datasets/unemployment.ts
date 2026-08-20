import unemploymentData from "@data/unemployment.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twenty-third real Dataset -- local unemployment rate, extended to
 * real multi-year history 1976-2026 (task 80, unblocked once BLS's own
 * real external maintenance window finally cleared). Real BLS Local Area
 * Unemployment Statistics (LAUS), a real free, self-serve BLS_API_KEY.
 * See scripts/gen_unemployment_data.py.
 *
 * 1976 is the REAL start of the LAUS program itself (confirmed live: a
 * request for years before 1976 returns "No Data Available", then real
 * monthly data starts exactly at 1976-01) -- not a project-side
 * limitation. BLS's own API caps any single request to a 20-year window,
 * so the real 51-year range needed three separate real fetches.
 *
 * One layer: real BLS LAUS rate, city-level where a real series exists
 * that year, a real county-level fallback otherwise -- applied PER YEAR,
 * since real city-tier series coverage has itself grown over the
 * decades (a city can have a real city-level series in recent years but
 * only a county-level one further back). Direct rescale, FIXED cap per
 * year (25%) for cross-year comparability -- real COVID-era spikes push
 * well above the old single-snapshot dataset's 12% cap.
 */
interface UnemploymentYear {
  unemployment_rate_pct: number;
  period: string;
  tier: "city" | "county";
  concern: number;
}

interface UnemploymentRecord {
  years: Record<string, UnemploymentYear>;
}

interface UnemploymentMeta {
  years: number[];
}

const DATA = unemploymentData as unknown as Record<string, UnemploymentRecord> & { _meta: UnemploymentMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getUnemploymentValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "unemployment_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const tierNote = yearData.tier === "city" ? "city rate" : "county rate -- no city-specific LAUS series that year";
  return {
    value: yearData.concern,
    detail: `${yearData.unemployment_rate_pct}% unemployment rate, ${yearData.period} ${year} (${tierNote}) -- BLS LAUS`,
  };
}

export const unemploymentDataset: Dataset = {
  id: "unemployment",
  label: "Unemployment",
  description: "Real BLS Local Area Unemployment Statistics, 1976-2026 -- city-level where available, county fallback otherwise.",
  methodologyUrl: methodologyDocUrl("unemployment"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "unemployment_rate", label: "Unemployment rate" }],
  getValue: getUnemploymentValue,
};
