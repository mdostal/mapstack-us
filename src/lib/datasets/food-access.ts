import foodAccessData from "@data/food-access.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The seventh real Dataset -- USDA ERS's Food Access Research Atlas (FARA),
 * joined at census TRACT level via a 2010-vintage crosswalk
 * (geocode_city_tracts_2010.py) -- a SEPARATE crosswalk from svi.ts's,
 * since FARA's tract boundaries are frozen at the 2010 census and tracts
 * get renumbered by the 2020 census in many places. See
 * scripts/gen_food_access_data.py's doc comment for the real mismatch
 * this was found and fixed for.
 *
 * Real multi-vintage history -- 2010, 2015, 2019 -- the only three real
 * vintages FARA has ever published (confirmed live via ERS's own
 * download page), not an annual series. All three share the same
 * CensusTract GEOID format and column names, so the existing 2010-
 * vintage crosswalk serves every vintage.
 *
 * Two SEPARATE layers, not one blend -- same "don't invent a weighting"
 * principle as every other multi-layer dataset here:
 *   - low_access: % of the WHOLE tract population living >0.5 mile
 *     (urban) from the nearest large supermarket/grocery.
 *   - low_income_low_access: % of the LOW-INCOME population specifically
 *     living that far away -- the more targeted "food desert" measure.
 *
 * Both already 0-100 (a population share), already "higher = more
 * concerning" -- no inversion needed, and directly comparable across
 * vintages (a real percentage, not a percentile rank). A minority of
 * tracts have FARA's own null (no population base to compute a share),
 * preserved honestly.
 */
type FoodAccessLayer = "low_access" | "low_income_low_access";

interface FoodAccessYear {
  low_access: number | null;
  low_income_low_access: number | null;
}

interface FoodAccessRecord {
  tract: string;
  years: Record<string, FoodAccessYear>;
}

interface FoodAccessMeta {
  years: number[];
}

const DATA = foodAccessData as unknown as Record<string, FoodAccessRecord> & { _meta: FoodAccessMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

const LAYER_LABELS: Record<FoodAccessLayer, string> = {
  low_access: "Low food access",
  low_income_low_access: "Low-income low food access",
};

function getFoodAccessValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  const layer = layerId as FoodAccessLayer;
  if (!(layer in LAYER_LABELS)) return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const value = yearData[layer];
  if (value === null || value === undefined) return null;

  return {
    value,
    detail: `${value}% of ${layer === "low_access" ? "tract" : "low-income"} population >0.5mi from a supermarket, ${record.tract}, ${year} -- USDA ERS Food Access Research Atlas`,
  };
}

export const foodAccessDataset: Dataset = {
  id: "food-access",
  label: "Food access",
  description: "USDA Food Access Research Atlas, 2010/2015/2019 -- share of a population living far from a supermarket, higher = more concerning.",
  methodologyUrl: methodologyDocUrl("food-access"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: (Object.keys(LAYER_LABELS) as FoodAccessLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getFoodAccessValue,
};
