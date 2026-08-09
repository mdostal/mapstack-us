import electricityCostData from "@data/electricity-cost.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The forty-second real Dataset -- state-level residential electricity
 * retail price, ddr13-1 (data-drive-round-13 epic). Real EIA (Energy
 * Information Administration) API v2, unlocked by a real EIA_API_KEY
 * obtained this session (also in GCP Secret Manager, project
 * personalsites-487021). See scripts/gen_electricity_cost_data.py.
 *
 * State-level only, the same honest limit already carried by
 * income-tax.ts/sales-tax.ts/property-tax.ts -- every spine city in a
 * state gets that state's real number, joined directly against
 * data/cities.json's own `state` field, no crosswalk.
 *
 * Real multi-year history (2001-2025), per explicit operator direction
 * to get "as much data as possible" for real trends over time. One
 * single EIA API request (confirmed live: 1550 real rows) returns every
 * real year at once -- no per-year looping needed.
 *
 * One layer: real residential price (cents/kWh) per year, direct
 * rescale capped at a real observed max (41, a FIXED cap across every
 * year so a state's price stays honestly comparable year to year),
 * higher price = more concerning. 512/512 real coverage at every year.
 */
interface ElectricityCostYear {
  price_cents_per_kwh: number;
  concern: number;
}

interface ElectricityCostRecord {
  state: string;
  years: Record<string, ElectricityCostYear>;
}

interface ElectricityCostMeta {
  years: number[];
}

const DATA = electricityCostData as unknown as Record<string, ElectricityCostRecord> & { _meta: ElectricityCostMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getElectricityCostValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "electricity_cost") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.price_cents_per_kwh}¢/kWh average residential electricity price in ${record.state} in ${year} -- EIA (Energy Information Administration)`,
  };
}

export const electricityCostDataset: Dataset = {
  id: "electricity-cost",
  label: "Electricity cost",
  description: "Real EIA state-level residential electricity price, 2001-2025 -- higher price = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/electricity-cost-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "electricity_cost", label: "Electricity cost" }],
  getValue: getElectricityCostValue,
};
