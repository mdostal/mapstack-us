import healthData from "@data/health.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The sixth real Dataset -- CDC PLACES chronic-disease-prevalence
 * measures, joined at census PLACE level. Reuses the SAME city->county
 * geocoder lookups hazard.ts's build already cached (extract_city_places.py
 * re-parses that existing cache for each city's place GEOID, zero new
 * network calls needed for the crosswalk) -- see scripts/gen_health_data.py.
 *
 * Five SEPARATE layers, not one blend -- same "don't invent a weighting"
 * principle as crime.ts/hazard.ts/svi.ts: asthma, obesity, diabetes,
 * depression, high blood pressure, all age-adjusted prevalence (%),
 * already "higher = more concerning" with no inversion needed.
 *
 * A real per-place vintage gap: most places report 2023 data, a handful
 * (Philadelphia, Louisville, Pittsburgh, ...) only have 2022 -- recorded
 * per-measure rather than silently normalized to one shared year. A
 * smaller number of places (12/512) have NO age-adjusted data at all for
 * these 5 measures in either year -- 3 with no place-level geography to
 * query in the first place, 9 more whose real, matched PLACES row simply
 * covers a different measure subset (verified directly against the API
 * for those 9 specifically) -- see health-methodology.md. Both honestly
 * null, not a join bug.
 */
type HealthLayer = "asthma" | "obesity" | "diabetes" | "depression" | "high_blood_pressure";

interface HealthRecord {
  place: string;
  asthma: number | null;
  asthma_year: number | null;
  obesity: number | null;
  obesity_year: number | null;
  diabetes: number | null;
  diabetes_year: number | null;
  depression: number | null;
  depression_year: number | null;
  high_blood_pressure: number | null;
  high_blood_pressure_year: number | null;
}

const DATA = healthData as unknown as Record<string, HealthRecord> & { _meta: unknown };

const LAYER_LABELS: Record<HealthLayer, string> = {
  asthma: "Asthma",
  obesity: "Obesity",
  diabetes: "Diabetes",
  depression: "Depression",
  high_blood_pressure: "High blood pressure",
};

function getHealthValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record) return null;

  const layer = layerId as HealthLayer;
  const value = record[layer];
  if (value === null || value === undefined) return null;

  const year = record[`${layer}_year` as keyof HealthRecord];
  return {
    value,
    detail: `${value}% age-adjusted prevalence, ${record.place} -- CDC PLACES ${year}`,
  };
}

export const healthDataset: Dataset = {
  id: "health",
  label: "Health outcomes",
  description: "CDC PLACES chronic-disease prevalence (age-adjusted) -- asthma, obesity, diabetes, depression, high blood pressure.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/health-methodology.md",
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as HealthLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getHealthValue,
};
