import costOfLivingData from "@data/cost-of-living.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-seventh real Dataset -- cost of living, unblocked by a real,
 * free, self-serve BEA_API_KEY (https://apps.bea.gov/API/signup/). See
 * scripts/gen_cost_of_living_data.py -- BEA only publishes Regional Price
 * Parities (RPP) at the national/state/MSA level, so this builds a real
 * city -> CBSA crosswalk from the Census Bureau's own 2023 CBSA
 * delineation file, joined against the existing city -> county FIPS
 * crosswalk.
 *
 * One layer: RPP, a real index where 100.0 = the national average cost
 * of goods, rents, and services combined. Metro-level for 502/512 cities;
 * a real state-level RPP fallback for the 10 cities whose county isn't
 * part of any Metropolitan Statistical Area (BEA's MARPP table only
 * covers Metro, not Micropolitan, areas) -- 512/512 total real coverage.
 * Direct rescale, capped at the real 2024 observed range (84.8-115.6),
 * padded slightly on both ends (82-118) for the score to breathe.
 */
interface CostOfLivingRecord {
  rpp: number;
  tier: "metro" | "state";
  tier_name: string;
  score: number;
}

const DATA = costOfLivingData as unknown as Record<string, CostOfLivingRecord> & { _meta: unknown };

function getCostOfLivingValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "cost_of_living") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const comparison = record.rpp >= 100 ? `${(record.rpp - 100).toFixed(1)}% above` : `${(100 - record.rpp).toFixed(1)}% below`;
  const tierNote = record.tier === "metro" ? record.tier_name : `${record.tier_name} state average -- no metro-area RPP for this city`;
  return {
    value: record.score,
    detail: `RPP ${record.rpp} -- ${comparison} the national average (${tierNote}) -- BEA Regional Price Parities`,
  };
}

export const costOfLivingDataset: Dataset = {
  id: "cost-of-living",
  label: "Cost of living",
  description: "Regional Price Parities -- real BEA index of goods, rents, and services cost vs. the national average.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/cost-of-living-methodology.md",
  supportsTime: false,
  layers: [{ id: "cost_of_living", label: "Cost of living" }],
  getValue: getCostOfLivingValue,
};
