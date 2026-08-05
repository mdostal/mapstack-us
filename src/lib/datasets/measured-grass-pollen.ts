import measuredGrassPollenData from "@data/measured-grass-pollen.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-first real Dataset -- REAL, MEASURED grass pollen days,
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
 * covered city currently shares the exact same regional value -- an
 * honest single-station limitation, not a bug, the same posture
 * political-lean.ts's county-level numbers carry.
 */
interface MeasuredGrassPollenRecord {
  avg_elevated_grass_pollen_days_per_year: number;
  years_averaged: number[];
  distance_km_from_station_region: number;
  concern: number;
}

const DATA = measuredGrassPollenData as unknown as Record<string, MeasuredGrassPollenRecord> & { _meta: unknown };

function getMeasuredGrassPollenValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "measured_grass_pollen") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const yearRange = `${Math.min(...record.years_averaged)}-${Math.max(...record.years_averaged)}`;
  return {
    value: record.concern,
    detail: `${record.avg_elevated_grass_pollen_days_per_year} real measured elevated-grass-pollen days/year on average (${yearRange}) -- Carver County, MN Environmental Services, ${record.distance_km_from_station_region} km from this city`,
  };
}

export const measuredGrassPollenDataset: Dataset = {
  id: "measured-grass-pollen",
  label: "Measured grass pollen (real, limited coverage)",
  description: "Real, measured elevated-grass-pollen-day counts from real health-department pollen stations -- not a model, but only covers cities near a real station (currently just the Twin Cities MN metro).",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/measured-grass-pollen-methodology.md",
  supportsTime: false,
  layers: [{ id: "measured_grass_pollen", label: "Measured grass pollen" }],
  getValue: getMeasuredGrassPollenValue,
};
