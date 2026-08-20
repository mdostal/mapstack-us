import winterColdBurdenData from "@data/winter-cold-burden.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The fortieth real Dataset -- winter cold burden, ddr12-1
 * (data-drive-round-12 epic). Real NOAA 1991-2020 U.S. Climate Normals,
 * no API key -- the direct winter-cold complement to heat.ts's
 * extreme-heat-days dataset, reusing the exact same real station-
 * inventory + nearest-match pipeline shape (see
 * scripts/fetch_winter_cold_stations.py + scripts/gen_winter_cold_burden_data.py).
 *
 * One layer: average number of days per year with a min temperature at
 * or below 32°F/freezing (NOAA's own ANN-TMIN-AVGNDS-LSTH032 normal),
 * nearest-station matched to every one of the 512 spine cities --
 * 512/512 real coverage, all within 27km (tighter than heat.ts's own
 * real spread). Already a meaningful, externally bounded quantity
 * (days/year), so directly rescaled onto 0-100 (capped at 180 days --
 * see data/winter-cold-burden-methodology.md), not a percentile rank.
 */
interface WinterColdBurdenRecord {
  freezing_days_per_year: number;
  concern: number;
  station_name: string;
  station_distance_km: number;
}

const DATA = winterColdBurdenData as unknown as Record<string, WinterColdBurdenRecord> & { _meta: unknown };

function getWinterColdBurdenValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "winter_cold_burden") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.freezing_days_per_year} days/year at or below 32°F on average -- nearest station: ${record.station_name} (${record.station_distance_km} km away) -- NOAA 1991-2020 Climate Normals`,
  };
}

export const winterColdBurdenDataset: Dataset = {
  id: "winter-cold-burden",
  label: "Winter cold burden",
  description: "Average number of days per year with a min temperature at or below 32°F -- NOAA 1991-2020 Climate Normals, nearest-station matched.",
  methodologyUrl: methodologyDocUrl("winter-cold-burden"),
  supportsTime: false,
  layers: [{ id: "winter_cold_burden", label: "Winter cold burden" }],
  getValue: getWinterColdBurdenValue,
};
