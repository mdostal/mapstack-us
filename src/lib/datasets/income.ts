import incomeData from "@data/income.json";
import { toOrdinal } from "@/lib/datasets/format";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The seventeenth real Dataset -- median household income, and the
 * second "Census-cluster" roadmap item (population, INCOME, broadband,
 * tax, housing). See scripts/gen_income_data.py.
 *
 * Real multi-year history (2009-2023), per explicit operator direction
 * to get "as much data as possible" for real trends over time. This
 * required switching sources -- County Health Rankings (the original
 * source) only republishes the current release, no real historical
 * archive -- to a DIRECT Census API pull, table B19013_001E, place-level
 * (city->place-FIPS crosswalk, the same pattern property-tax.ts already
 * proved). 2009 is B19013's own real floor: the first-ever ACS5 vintage.
 *
 * A real, deliberate geography change alongside the year extension: the
 * original CHR build was county-level with a state fallback for
 * suppressed counties; this direct-Census pull is place-level (a real
 * precision improvement) and does NOT carry over that fallback, so real
 * coverage may differ city to city from the prior build.
 *
 * One layer: real dollar median household income, percentile-ranked and
 * INVERTED among THAT YEAR's own covered cities (lower income = more
 * concerning) -- a dollar figure has no natural ceiling to rescale
 * against, so this uses the same per-year percentile convention
 * crime.ts's own multi-year layers use -- not comparable across years,
 * same real caveat.
 */
interface IncomeYear {
  median_income: number;
  concern: number;
}

interface IncomeRecord {
  years: Record<string, IncomeYear>;
}

interface IncomeMeta {
  years: number[];
}

const DATA = incomeData as unknown as Record<string, IncomeRecord> & { _meta: IncomeMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getIncomeValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "median_income") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    // Real ordinal-suffix bug found live by this project's own QA sweep,
    // fixed: this previously always hardcoded "th" (e.g. "82.1th
    // percentile" for a value not ending in a bare 4-9).
    detail: `$${yearData.median_income.toLocaleString()} median household income in ${year} (${toOrdinal(yearData.concern)} percentile among that year's covered cities) -- Census ACS`,
  };
}

export const incomeDataset: Dataset = {
  id: "income",
  label: "Median household income",
  description: "Real Census ACS median household income, place-level, 2009-2023 -- lower income = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/income-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "median_income", label: "Median household income", legendLow: "Higher income", legendHigh: "Lower income" }],
  getValue: getIncomeValue,
};
