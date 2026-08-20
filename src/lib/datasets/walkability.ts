import walkabilityData from "@data/walkability.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twelfth real Dataset -- EPA's official National Walkability Index,
 * queried directly from EPA's own free, keyless ArcGIS FeatureServer at
 * each city's stored coordinate (geodata.epa.gov/.../WalkabilityIndex),
 * the same "hosted queryable FeatureServer" pattern hazard.ts (FEMA NRI)
 * and transit-access.ts (Census Urban Areas) already use -- sidesteps the
 * "needs local GDAL/shapefile GIS tooling" objection the dataset backlog
 * research assumed this candidate required. See
 * scripts/gen_walkability_data.py.
 *
 * One layer: EPA's own already-computed NatWalkInd, a fixed, official
 * 1-20 scale (1 = least walkable, 20 = most walkable) -- linearly
 * rescaled onto 0-100 and inverted (lower walkability = more concerning),
 * NOT a percentile among the 512 spine cities, since EPA's scale is
 * already externally meaningful (same posture as hazard.ts's direct use
 * of FEMA's own 0-100 score).
 *
 * A real, important, PROMINENT caveat (not buried): this is a SINGLE
 * block-group sample at each city's one stored reference coordinate
 * (typically a downtown/city-hall point), not a population-weighted
 * average across the whole city. Confirmed directly and worth naming
 * explicitly: Los Angeles scores HIGHER than New York City here, because
 * LA's stored coordinate lands in dense Downtown LA, while NYC's overall
 * famously higher walkability isn't what this measures at all -- this
 * layer answers "how walkable is the specific block this city's map pin
 * sits on," not "how walkable is this city overall." See
 * data/walkability-methodology.md.
 */
interface WalkabilityRecord {
  nat_walk_ind: number;
  block_group: string;
  cbsa: string | null;
  concern: number;
}

const DATA = walkabilityData as unknown as Record<string, WalkabilityRecord> & { _meta: unknown };

function getWalkabilityValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "walkability") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.nat_walk_ind}/20 National Walkability Index, block group ${record.block_group} -- EPA Smart Location Database`,
  };
}

export const walkabilityDataset: Dataset = {
  id: "walkability",
  label: "Walkability",
  description: "EPA National Walkability Index at each city's reference point -- higher score, less walkable = more concerning.",
  methodologyUrl: methodologyDocUrl("walkability"),
  supportsTime: false,
  layers: [{ id: "walkability", label: "Walkability", legendLow: "Walkable", legendHigh: "Car-dependent" }],
  getValue: getWalkabilityValue,
};
