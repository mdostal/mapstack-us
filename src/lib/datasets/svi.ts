import sviData from "@data/svi.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The sixth real Dataset -- CDC/ATSDR's Social Vulnerability Index (SVI),
 * a composite of 16 socioeconomic/demographic variables into a single
 * "how exposed is this community to disaster/crisis broadly" signal.
 * Reuses the SAME city->county geocoder lookups hazard.ts's build already
 * cached (scripts/extract_city_tracts.py re-parses that existing cache
 * for the census TRACT GEOID, zero new network calls needed for the
 * crosswalk) -- see scripts/gen_svi_data.py.
 *
 * Five SEPARATE layers, not one blend -- same "don't invent a weighting"
 * principle as crime.ts/hazard.ts: the overall composite, plus its 4
 * sub-themes (socioeconomic, household, minority/language,
 * housing/transportation) kept distinct.
 *
 * SVI's own RPL_* values are already a 0-1 "higher = more vulnerable"
 * percentile -- no inversion needed, just rescaled to 0-100. SVI's own
 * -999 sentinel for suppressed/unreliable small-population tracts is
 * preserved as a real null, never coerced to 0 (see gen_svi_data.py).
 *
 * Tract-level, not city-level -- an even finer resolution than hazard.ts's
 * county-level join, but still one number for a whole tract, the same
 * "one number for a whole jurisdiction" caveat as crime's one-agency and
 * hazard's one-county limitations.
 */
type SviLayer = "overall" | "socioeconomic" | "household" | "minority_language" | "housing_transport";

interface SviRecord {
  tract: string;
  county: string;
  state: string;
  fips: string;
  overall: number | null;
  socioeconomic: number | null;
  household: number | null;
  minority_language: number | null;
  housing_transport: number | null;
}

const DATA = sviData as unknown as Record<string, SviRecord> & { _meta: unknown };

const LAYER_LABELS: Record<SviLayer, string> = {
  overall: "Overall social vulnerability",
  socioeconomic: "Socioeconomic status",
  household: "Household characteristics",
  minority_language: "Minority status / language",
  housing_transport: "Housing type / transportation",
};

function getSviValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record) return null;

  const layer = layerId as SviLayer;
  const value = record[layer];
  if (value === null || value === undefined) return null;

  return {
    value,
    detail: `${value}th percentile, ${record.tract}, ${record.county}, ${record.state} -- CDC/ATSDR SVI 2022`,
  };
}

export const sviDataset: Dataset = {
  id: "svi",
  label: "Social vulnerability",
  description: "CDC/ATSDR Social Vulnerability Index -- how exposed a community is to disaster/crisis broadly, higher = more vulnerable.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/svi-methodology.md",
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as SviLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getSviValue,
};
