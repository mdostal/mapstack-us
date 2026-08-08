import incomeData from "@data/income.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The seventeenth real Dataset -- median household income, and the
 * second "Census-cluster" roadmap item (population, INCOME, broadband,
 * tax, housing) unblocked without the missing CENSUS_API_KEY. Same
 * discovery as broadband.ts: County Health Rankings' free national CSV
 * (the same file traffic-fatalities.ts/broadband.ts already use)
 * republishes real Census ACS median household income directly. See
 * scripts/gen_income_data.py.
 *
 * Reuses the SAME city->county crosswalk hazard.ts/broadband.ts already
 * built -- zero new geocoding.
 *
 * One layer: real dollar median household income, percentile-ranked and
 * INVERTED among covered cities (lower income = more concerning) --
 * unlike broadband.ts's already-bounded 0-100 percentage, a dollar
 * figure has no natural ceiling to rescale against, so this uses the
 * same percentile convention housing-inventory.ts/days-on-market.ts
 * already use for their own unbounded raw quantities.  512/512 real
 * coverage.
 */
interface IncomeRecord {
  median_income: number;
  county: string;
  fallback: "state" | null;
  concern: number;
}

const DATA = incomeData as unknown as Record<string, IncomeRecord> & { _meta: unknown };

function getIncomeValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "median_income") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const fallbackNote = record.fallback === "state" ? ` (${record.county} County suppressed -- showing state average)` : ` (${record.county} County)`;
  return {
    value: record.concern,
    detail: `$${record.median_income.toLocaleString()} median household income${fallbackNote} -- County Health Rankings / Census ACS`,
  };
}

export const incomeDataset: Dataset = {
  id: "income",
  label: "Median household income",
  description: "Real Census ACS median household income, county-level -- County Health Rankings, lower income = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/income-methodology.md",
  supportsTime: false,
  layers: [{ id: "median_income", label: "Median household income", legendLow: "Higher income", legendHigh: "Lower income" }],
  getValue: getIncomeValue,
};
