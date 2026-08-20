import earthquakeData from "@data/earthquake.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The thirty-fourth real Dataset -- USGS seismic design values, ddr6-1
 * (data-drive-round-6 epic). A genuinely new hazard category not
 * represented anywhere else in this project -- `hazard.ts`'s existing
 * FEMA National Risk Index layers cover flood/wildfire, not earthquake.
 * See scripts/gen_earthquake_data.py.
 *
 * Uses each city's own real lat/lon directly -- no crosswalk needed at
 * all, unlike almost every other dataset in this repo.
 *
 * One layer: real `sds` (Design Spectral Response Acceleration, short
 * period), the same standard value ASCE 7 building codes use for
 * Seismic Design Category classification -- direct rescale, higher =
 * more concerning.
 */
interface EarthquakeRecord {
  sds: number;
  sdc: string | null;
  score: number;
}

const DATA = earthquakeData as unknown as Record<string, EarthquakeRecord> & { _meta: unknown };

function getEarthquakeValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "seismic_risk") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const sdcNote = record.sdc ? ` (Seismic Design Category ${record.sdc})` : "";
  return {
    value: record.score,
    detail: `${record.sds} g design spectral acceleration${sdcNote} -- USGS ASCE 7-22`,
  };
}

export const earthquakeDataset: Dataset = {
  id: "earthquake",
  label: "Seismic risk",
  description: "Real USGS seismic design values -- the same standard building-code values, higher = more concerning.",
  methodologyUrl: methodologyDocUrl("earthquake"),
  supportsTime: false,
  layers: [{ id: "seismic_risk", label: "Seismic risk" }],
  getValue: getEarthquakeValue,
};
