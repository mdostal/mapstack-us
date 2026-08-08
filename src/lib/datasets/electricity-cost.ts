import electricityCostData from "@data/electricity-cost.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

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
 * One layer: real 2025 residential price (cents/kWh), direct rescale
 * capped at a real observed max (41, Hawaii's real 40.59), higher price
 * = more concerning. 512/512 real coverage.
 */
interface ElectricityCostRecord {
  price_cents_per_kwh: number;
  concern: number;
  state: string;
}

const DATA = electricityCostData as unknown as Record<string, ElectricityCostRecord> & { _meta: unknown };

function getElectricityCostValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "electricity_cost") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.price_cents_per_kwh}¢/kWh average residential electricity price in ${record.state} -- EIA (Energy Information Administration)`,
  };
}

export const electricityCostDataset: Dataset = {
  id: "electricity-cost",
  label: "Electricity cost",
  description: "Real EIA state-level residential electricity price -- higher price = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/electricity-cost-methodology.md",
  supportsTime: false,
  layers: [{ id: "electricity_cost", label: "Electricity cost" }],
  getValue: getElectricityCostValue,
};
