import housingInventoryData from "@data/housing-inventory.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The ninth real Dataset -- Zillow Research's free, keyless "For-Sale
 * Inventory" city-level data, the simplest join of any dataset built this
 * session: direct city/state name match, no geocoding crosswalk at all.
 * Extended to real multi-year history 2018-2026 (ddr-zillow-extend, this
 * session) -- the same file already fetched for the original single-
 * snapshot build turns out to be a full monthly time series back to
 * 2018-03; no new source needed, just parsing every month instead of
 * only the latest. See scripts/gen_housing_inventory_data.py.
 *
 * One layer: how many homes are actively for sale, normalized by
 * population (listings per 1,000 residents), then percentile-ranked and
 * INVERTED among covered cities -- LOWER supply per capita is MORE
 * concerning (tighter market, harder to find a home), same "percentile
 * among covered cities" convention crime.ts established, computed
 * independently PER YEAR at generation time (not comparable across
 * years, only within a year).
 *
 * A real, documented tension: very low supply can also mean a place is
 * highly desirable, not distressed -- this measures market TIGHTNESS,
 * not desirability. See data/housing-inventory-methodology.md.
 */
interface HousingInventoryYear {
  listings: number;
  month: string;
  listings_per_1000: number;
  concern: number;
}

interface HousingInventoryRecord {
  years: Record<string, HousingInventoryYear>;
}

interface HousingInventoryMeta {
  years: number[];
}

const DATA = housingInventoryData as unknown as Record<string, HousingInventoryRecord> & { _meta: HousingInventoryMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getHousingInventoryValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "supply_tightness") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.listings_per_1000.toFixed(2)} homes for sale per 1,000 residents (${yearData.listings} listings, ${yearData.month}) -- Zillow Research`,
  };
}

export const housingInventoryDataset: Dataset = {
  id: "housing-inventory",
  label: "Housing supply",
  description: "Zillow For-Sale Inventory, 2018-2026 -- how tight the local home-buying market is, higher = fewer homes for sale relative to population.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/housing-inventory-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "supply_tightness", label: "Housing market tightness" }],
  getValue: getHousingInventoryValue,
};
