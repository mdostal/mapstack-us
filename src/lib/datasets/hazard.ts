import hazardData from "@data/hazard.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The fourth real Dataset -- FEMA's National Risk Index (free, keyless
 * ArcGIS FeatureServer; see scripts/gen_hazard_data.py), joined to each
 * spine city's COUNTY (not the city itself) via a Census geocoder lookup
 * on the city's own lat/lon (scripts/geocode_city_counties.py, also free
 * and keyless -- a different service from the Census statistical data API
 * that needs CENSUS_API_KEY).
 *
 * County-level, not city-level -- a real, documented resolution
 * limitation (a small town far from its county seat inherits a blurred
 * number), same shape as crime's "one agency, one number" caveat. See
 * data/hazard-methodology.md.
 *
 * Four SEPARATE layers, not one blend -- same "don't invent a weighting
 * across hazards" principle crime.ts uses for violent vs. property crime.
 * FEMA's own scores are already 0-100, higher = more concerning, so no
 * re-normalization or percentile recompute is needed (unlike crime's own
 * percentile-among-covered-cities convention).
 */
type HazardLayer = "risk" | "inland_flood" | "coastal_flood" | "wildfire";

interface HazardRecord {
  county: string;
  state: string;
  stcofips: string;
  risk_score: number | null;
  risk_rating: string;
  inland_flood_score: number | null;
  inland_flood_rating: string;
  coastal_flood_score: number | null;
  coastal_flood_rating: string;
  wildfire_score: number | null;
  wildfire_rating: string;
}

const DATA = hazardData as unknown as Record<string, HazardRecord> & { _meta: unknown };

const LAYER_LABELS: Record<HazardLayer, string> = {
  risk: "Overall risk (all hazards)",
  inland_flood: "Inland flooding",
  coastal_flood: "Coastal flooding",
  wildfire: "Wildfire",
};

const SCORE_FIELD: Record<HazardLayer, keyof HazardRecord> = {
  risk: "risk_score",
  inland_flood: "inland_flood_score",
  coastal_flood: "coastal_flood_score",
  wildfire: "wildfire_score",
};

const RATING_FIELD: Record<HazardLayer, keyof HazardRecord> = {
  risk: "risk_rating",
  inland_flood: "inland_flood_rating",
  coastal_flood: "coastal_flood_rating",
  wildfire: "wildfire_rating",
};

function getHazardValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record) return null;

  const layer = layerId as HazardLayer;
  const score = record[SCORE_FIELD[layer]] as number | null;
  if (score === null || score === undefined) return null;

  const rating = record[RATING_FIELD[layer]] as string;
  return {
    value: score,
    tier: rating,
    detail: `${rating} (${score}/100), ${record.county} County, ${record.state} -- FEMA National Risk Index`,
  };
}

export const hazardDataset: Dataset = {
  id: "hazard",
  label: "Natural hazard risk",
  description: "FEMA National Risk Index scores by county -- overall risk plus flood and wildfire sub-scores, higher = more concerning.",
  methodologyUrl: methodologyDocUrl("hazard"),
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as HazardLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getHazardValue,
};
