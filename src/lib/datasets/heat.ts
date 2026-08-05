import heatData from "@data/heat.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The nineteenth real Dataset -- extreme heat days, sourced from NOAA's
 * 1991-2020 U.S. Climate Normals, no API key at all. Picked from
 * `.pHive/epics/data-store/docs/dataset-backlog.md` (#14) as the
 * strongest keyless candidate available while the Census-cluster
 * datasets (population, property tax) stay blocked on a missing
 * CENSUS_API_KEY. See scripts/fetch_heat_stations.py + scripts/gen_heat_data.py.
 *
 * One layer: average number of days per year with a max temperature
 * above 90F (NOAA's own ANN-TMAX-AVGNDS-GRTH090 normal), nearest-
 * station matched to every one of the 512 spine cities -- 512/512 real
 * coverage, tied with broadband.ts for the best of any dataset here.
 * Already a meaningful, externally bounded quantity (days/year), so
 * directly rescaled onto 0-100 (capped at 150 days -- see
 * data/heat-methodology.md), not a percentile rank among the spine.
 */
interface HeatRecord {
  days_above_90f: number;
  concern: number;
  station_name: string;
  station_distance_km: number;
}

const DATA = heatData as unknown as Record<string, HeatRecord> & { _meta: unknown };

function getHeatValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "extreme_heat_days") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.days_above_90f} days/year above 90°F on average -- nearest station: ${record.station_name} (${record.station_distance_km} km away)`,
  };
}

export const heatDataset: Dataset = {
  id: "heat",
  label: "Extreme heat",
  description: "Average number of days per year with a max temperature above 90°F -- NOAA 1991-2020 Climate Normals, nearest-station matched.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/heat-methodology.md",
  supportsTime: false,
  layers: [{ id: "extreme_heat_days", label: "Extreme heat days" }],
  getValue: getHeatValue,
};
