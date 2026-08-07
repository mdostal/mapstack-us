import triFacilityDensityData from "@data/tri-facility-density.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirtieth real Dataset -- EPA Toxics Release Inventory (TRI)
 * facility density, tri-1 (tri-bulk-and-data-drive-2 epic). A prior
 * attempt (dvd-6, dataset-verification-drive epic) tried EPA's live query
 * API and hit a real wall (16+ minutes for one state, truncated
 * response) -- that table is EPA's entire cumulative historical facility
 * registry, not built for bulk querying. The real fix, found in this
 * epic's research: EPA publishes a separate, purpose-built bulk download
 * -- one pre-built CSV per reporting year -- that returns the complete
 * national file in one ~60s request. See
 * scripts/gen_tri_facility_density_data.py.
 *
 * No crosswalk needed at all: `data/cities.json` already has real lat/lon
 * per city, and the TRI file has real lat/lon per facility, so this joins
 * by real geographic proximity (haversine), not FIPS.
 *
 * One layer: real count of TRI-reporting facilities within a 10-mile
 * radius, direct rescale capped at the real 2024 p90 across the spine
 * (66, padded to 70) -- higher count = more concerning (cumulative
 * proximity to reporting industrial facilities). 512/512 real coverage.
 */
interface TriFacilityDensityRecord {
  facility_count: number;
  score: number;
}

const DATA = triFacilityDensityData as unknown as Record<string, TriFacilityDensityRecord> & { _meta: unknown };

function getTriFacilityDensityValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "tri_facility_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.score,
    detail: `${record.facility_count} TRI-reporting facilities within 10 miles -- EPA Toxics Release Inventory, 2024`,
  };
}

export const triFacilityDensityDataset: Dataset = {
  id: "tri-facility-density",
  label: "Industrial facility density",
  description: "Real EPA Toxics Release Inventory facility proximity -- higher density of reporting facilities nearby = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/tri-facility-density-methodology.md",
  supportsTime: false,
  layers: [{ id: "tri_facility_density", label: "Industrial facility density" }],
  getValue: getTriFacilityDensityValue,
};
