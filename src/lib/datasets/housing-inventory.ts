import housingInventoryData from "@data/housing-inventory.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The ninth real Dataset -- Zillow Research's free, keyless "For-Sale
 * Inventory" city-level data, the simplest join of any dataset built this
 * session: direct city/state name match, no geocoding crosswalk at all.
 * See scripts/gen_housing_inventory_data.py.
 *
 * One layer: how many homes are actively for sale right now, normalized
 * by population (listings per 1,000 residents), then percentile-ranked
 * and INVERTED among covered cities -- LOWER supply per capita is MORE
 * concerning (tighter market, harder to find a home), same "percentile
 * among covered cities" convention crime.ts established, computed once at
 * generation time (not re-derived by the app).
 *
 * A real, documented tension: very low supply can also mean a place is
 * highly desirable, not distressed -- this measures market TIGHTNESS,
 * not desirability. See data/housing-inventory-methodology.md.
 */
interface HousingInventoryRecord {
  listings: number;
  month: string;
  listings_per_1000: number;
  concern: number;
}

const DATA = housingInventoryData as unknown as Record<string, HousingInventoryRecord> & { _meta: unknown };

function getHousingInventoryValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "supply_tightness") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.listings_per_1000.toFixed(2)} homes for sale per 1,000 residents (${record.listings} listings, ${record.month}) -- Zillow Research`,
  };
}

export const housingInventoryDataset: Dataset = {
  id: "housing-inventory",
  label: "Housing supply",
  description: "Zillow For-Sale Inventory -- how tight the local home-buying market is, higher = fewer homes for sale relative to population.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/housing-inventory-methodology.md",
  supportsTime: false,
  layers: [{ id: "supply_tightness", label: "Housing market tightness" }],
  getValue: getHousingInventoryValue,
};
