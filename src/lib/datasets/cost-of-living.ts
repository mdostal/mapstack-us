import costOfLivingData from "@data/cost-of-living.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twenty-sixth real Dataset -- cost of living, unblocked by a real,
 * free, self-serve BEA_API_KEY (https://apps.bea.gov/API/signup/). See
 * scripts/gen_cost_of_living_data.py -- BEA only publishes Regional Price
 * Parities (RPP) at the national/state/MSA level, so this builds a real
 * city -> CBSA crosswalk from the Census Bureau's own 2023 CBSA
 * delineation file, joined against the existing city -> county FIPS
 * crosswalk.
 *
 * Real multi-year history (2008-2024), per explicit operator direction
 * to get "as much data as possible" for real trends over time. 2008 is
 * RPP's own real floor -- the program didn't exist earlier. A real data
 * quality issue was found and fixed while extending: BEA's MARPP table
 * returns a literal "0" (not "(NA)") for a handful of metro/year gaps
 * (confirmed live: Enid OK and Kiryas Joel-Poughkeepsie-Newburgh NY,
 * 2008-2012) -- RPP can never legitimately be near 0, so "0" is treated
 * identically to a real "(NA)" gap, not a real value.
 *
 * One layer: RPP, a real index where 100.0 = the national average cost
 * of goods, rents, and services combined. Metro-level where a city's
 * county is part of a Metropolitan Statistical Area; a real state-level
 * RPP fallback otherwise (BEA's MARPP table only covers Metro, not
 * Micropolitan, areas). Direct rescale, capped at a FIXED real observed
 * range across all years (82-118) so a city's score stays honestly
 * comparable year to year.
 */
interface CostOfLivingYear {
  rpp: number;
  tier: "metro" | "state";
  tier_name: string;
  concern: number;
}

interface CostOfLivingRecord {
  years: Record<string, CostOfLivingYear>;
}

interface CostOfLivingMeta {
  years: number[];
}

const DATA = costOfLivingData as unknown as Record<string, CostOfLivingRecord> & { _meta: CostOfLivingMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getCostOfLivingValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "cost_of_living") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const comparison = yearData.rpp >= 100 ? `${(yearData.rpp - 100).toFixed(1)}% above` : `${(100 - yearData.rpp).toFixed(1)}% below`;
  const tierNote = yearData.tier === "metro" ? yearData.tier_name : `${yearData.tier_name} state average -- no metro-area RPP for this city`;
  return {
    value: yearData.concern,
    detail: `RPP ${yearData.rpp} in ${year} -- ${comparison} the national average (${tierNote}) -- BEA Regional Price Parities`,
  };
}

export const costOfLivingDataset: Dataset = {
  id: "cost-of-living",
  label: "Cost of living",
  description: "Regional Price Parities -- real BEA index of goods, rents, and services cost vs. the national average, 2008-2024.",
  methodologyUrl: methodologyDocUrl("cost-of-living"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "cost_of_living", label: "Cost of living" }],
  getValue: getCostOfLivingValue,
};
