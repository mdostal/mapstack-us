import foodAccessData from "@data/food-access.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The eighth real Dataset -- USDA ERS's Food Access Research Atlas (FARA),
 * joined at census TRACT level via a 2010-vintage crosswalk
 * (geocode_city_tracts_2010.py) -- a SEPARATE crosswalk from svi.ts's,
 * since FARA's tract boundaries are frozen at the 2010 census and tracts
 * get renumbered by the 2020 census in many places. See
 * scripts/gen_food_access_data.py's doc comment for the real mismatch
 * this was found and fixed for.
 *
 * Two SEPARATE layers, not one blend -- same "don't invent a weighting"
 * principle as every other multi-layer dataset here:
 *   - low_access: % of the WHOLE tract population living >0.5 mile
 *     (urban) from the nearest large supermarket/grocery.
 *   - low_income_low_access: % of the LOW-INCOME population specifically
 *     living that far away -- the more targeted "food desert" measure.
 *
 * Both already 0-100 (a population share), already "higher = more
 * concerning" -- no inversion needed. A minority of tracts have FARA's
 * own null (no population base to compute a share), preserved honestly.
 */
type FoodAccessLayer = "low_access" | "low_income_low_access";

interface FoodAccessRecord {
  tract: string;
  low_access: number | null;
  low_income_low_access: number | null;
}

const DATA = foodAccessData as unknown as Record<string, FoodAccessRecord> & { _meta: unknown };

const LAYER_LABELS: Record<FoodAccessLayer, string> = {
  low_access: "Low food access",
  low_income_low_access: "Low-income low food access",
};

function getFoodAccessValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record) return null;

  const layer = layerId as FoodAccessLayer;
  const value = record[layer];
  if (value === null || value === undefined) return null;

  return {
    value,
    detail: `${value}% of ${layer === "low_access" ? "tract" : "low-income"} population >0.5mi from a supermarket, ${record.tract} -- USDA ERS Food Access Research Atlas, 2019`,
  };
}

export const foodAccessDataset: Dataset = {
  id: "food-access",
  label: "Food access",
  description: "USDA Food Access Research Atlas -- share of a population living far from a supermarket, higher = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/food-access-methodology.md",
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as FoodAccessLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getFoodAccessValue,
};
