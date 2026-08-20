import measuredGrassPollenData from "@data/measured-grass-pollen.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twentieth real Dataset -- REAL, MEASURED grass pollen days,
 * direct operator request after allergy.ts's grass severity score turned
 * out to be climate-modeled rather than a real measured count. Real
 * station data exists, just scattered across individual state/county
 * health departments rather than one national feed. Operator-supplied
 * lead (Vermont's real, live "EPHT Pollen" ArcGIS dataset) led to
 * searching ArcGIS Online's own public catalog for siblings, which
 * turned up Carver County, MN's real "Elevated Pollen Days" annual
 * counts -- the only source found so far with any real spine-city match
 * (the Twin Cities MN metro). See scripts/gen_measured_grass_pollen_data.py
 * and data/measured-grass-pollen-methodology.md for the full source list,
 * including two more real stations found but not yet usable (Vermont has
 * no spine city nearby; Washington's sensor network's public layer ships
 * no readings).
 *
 * Deliberately a SEPARATE dataset from "Allergy severity," not a
 * replacement or a blended value -- explicit operator direction ("another
 * layer and option we can use ... be transparent on it and let us choose
 * how it maps") mirrors the project's existing "never invent a
 * cross-dataset blend" posture (see custom-blend.ts's own doc comment).
 * Real coverage is intentionally tiny (7 of 512 cities) and every
 * covered city currently shares the exact same regional value at a given
 * year -- an honest single-station limitation, not a bug, the same
 * posture political-lean.ts's county-level numbers carry.
 *
 * Real multi-year history -- 27 individual real years, 1993-2020 (a real
 * gap at 2003, Carver County's own table skips it, not a fetch error),
 * per explicit operator direction to get "as much data as possible" for
 * real trends over time. The original build only surfaced a single
 * pre-averaged 5-year window; every real year was already sitting in the
 * cached source and is now surfaced individually via `context.year`,
 * matching crime.ts's/political-lean.ts's per-year pattern. The station
 * itself hasn't published a new year since 2020 (a real, dated snapshot,
 * not a live feed) -- `availableYears` stops there, never inventing a
 * more recent year.
 */
interface MeasuredGrassPollenYear {
  elevated_grass_pollen_days: number;
  concern: number;
}

interface MeasuredGrassPollenRecord {
  distance_km_from_station_region: number;
  years: Record<string, MeasuredGrassPollenYear>;
}

interface MeasuredGrassPollenMeta {
  years: number[];
}

const DATA = measuredGrassPollenData as unknown as Record<string, MeasuredGrassPollenRecord> & {
  _meta: MeasuredGrassPollenMeta;
};
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getMeasuredGrassPollenValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "measured_grass_pollen") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.elevated_grass_pollen_days} real measured elevated-grass-pollen days in ${year} -- Carver County, MN Environmental Services, ${record.distance_km_from_station_region} km from this city`,
  };
}

export const measuredGrassPollenDataset: Dataset = {
  id: "measured-grass-pollen",
  label: "Measured grass pollen (real, limited coverage)",
  description: "Real, measured elevated-grass-pollen-day counts from real health-department pollen stations, year by year 1993-2020 -- not a model, but only covers cities near a real station (currently just the Twin Cities MN metro).",
  methodologyUrl: methodologyDocUrl("measured-grass-pollen"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "measured_grass_pollen", label: "Measured grass pollen" }],
  getValue: getMeasuredGrassPollenValue,
};
