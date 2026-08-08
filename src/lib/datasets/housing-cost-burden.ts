import housingCostBurdenData from "@data/housing-cost-burden.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The eighteenth real Dataset -- housing affordability stress, and the
 * third "Census-cluster" roadmap item (population, income, broadband,
 * tax, HOUSING). See scripts/gen_housing_cost_burden_data.py.
 *
 * A genuinely different housing angle from the two Zillow-sourced
 * datasets already shipped (housing-inventory.ts measures market
 * TIGHTNESS/supply, days-on-market.ts measures market SPEED) -- this
 * measures affordability STRESS: the real percentage of households
 * spending 50%+ of their income on housing. A market can be loose and
 * slow while still being unaffordable for the people who already live
 * there; these three housing layers are complementary, not redundant.
 *
 * Real multi-year history (2009-2023), per explicit operator direction
 * to get "as much data as possible" for real trends over time. Switched
 * from County Health Rankings (current-release-only) to a DIRECT Census
 * API pull, combining real B25070 (renter) and B25091 (owner) severe
 * cost-burden brackets the same way CHR's own measure does -- verified
 * live bracket codes, not guessed. Place-level (city->place-FIPS
 * crosswalk), the same real precision improvement income.ts made
 * alongside its own year extension.
 *
 * One layer: real Census ACS severe-housing-cost-burden percentage,
 * already a meaningful 0-100 quantity, used directly as the concern
 * score (higher = more concerning, no inversion needed) -- unlike
 * income's unbounded dollar figure, this IS comparable across years (a
 * real percentage, not a relative-to-that-year's-cohort rank).
 */
interface HousingCostBurdenYear {
  pct_severe_burden: number;
  concern: number;
}

interface HousingCostBurdenRecord {
  years: Record<string, HousingCostBurdenYear>;
}

interface HousingCostBurdenMeta {
  years: number[];
}

const DATA = housingCostBurdenData as unknown as Record<string, HousingCostBurdenRecord> & { _meta: HousingCostBurdenMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getHousingCostBurdenValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "severe_cost_burden") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.pct_severe_burden}% of households spend 50%+ of income on housing in ${year} -- Census ACS`,
  };
}

export const housingCostBurdenDataset: Dataset = {
  id: "housing-cost-burden",
  label: "Housing affordability",
  description: "Percent of households severely cost-burdened by housing (50%+ of income), real Census ACS data, 2009-2023.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/housing-cost-burden-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "severe_cost_burden", label: "Severe housing cost burden" }],
  getValue: getHousingCostBurdenValue,
};
