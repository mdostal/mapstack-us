import housingCostBurdenData from "@data/housing-cost-burden.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The eighteenth real Dataset -- housing affordability stress, and the
 * third "Census-cluster" roadmap item (population, income, broadband,
 * tax, HOUSING) unblocked without the missing CENSUS_API_KEY, via the
 * same County Health Rankings free CSV broadband.ts/income.ts already
 * use. See scripts/gen_housing_cost_burden_data.py.
 *
 * A genuinely different housing angle from the two Zillow-sourced
 * datasets already shipped (housing-inventory.ts measures market
 * TIGHTNESS/supply, days-on-market.ts measures market SPEED) -- this
 * measures affordability STRESS: the real percentage of households
 * spending 50%+ of their income on housing. A market can be loose and
 * slow while still being unaffordable for the people who already live
 * there; these three housing layers are complementary, not redundant.
 *
 * Reuses the SAME city->county crosswalk hazard.ts/broadband.ts/
 * income.ts already built -- zero new geocoding.
 *
 * One layer: real Census ACS severe-housing-cost-burden percentage,
 * already a meaningful 0-100 quantity, used directly as the concern
 * score (higher = more concerning, no inversion needed) -- same posture
 * as hazard.ts's/walkability.ts's own externally-meaningful-scale data.
 * 512/512 real coverage.
 */
interface HousingCostBurdenRecord {
  pct_severe_burden: number;
  county: string;
  fallback: "state" | null;
  concern: number;
}

const DATA = housingCostBurdenData as unknown as Record<string, HousingCostBurdenRecord> & { _meta: unknown };

function getHousingCostBurdenValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "severe_cost_burden") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const fallbackNote = record.fallback === "state" ? ` (${record.county} County suppressed -- showing state average)` : ` (${record.county} County)`;
  return {
    value: record.concern,
    detail: `${record.pct_severe_burden}% of households spend 50%+ of income on housing${fallbackNote} -- County Health Rankings / Census ACS`,
  };
}

export const housingCostBurdenDataset: Dataset = {
  id: "housing-cost-burden",
  label: "Housing affordability",
  description: "Percent of households severely cost-burdened by housing (50%+ of income) -- County Health Rankings, sourced from Census ACS.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/housing-cost-burden-methodology.md",
  supportsTime: false,
  layers: [{ id: "severe_cost_burden", label: "Severe housing cost burden" }],
  getValue: getHousingCostBurdenValue,
};
