import crimeData from "@data/crime.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The second real Dataset -- a deliberately DIFFERENT shape from allergy
 * (climate/season-modeled scores) and from allergy-locator's care-access
 * (nearest-point drive time): a real, government-sourced RATE (offenses
 * per 100k residents), computed from the FBI Crime Data Explorer API. This
 * is the actual stress-test of the generalized wrapper interface -- a
 * third genuinely different data shape fitting the same contract.
 *
 * Two independent layers (violent crime, property crime), not one blended
 * score -- deliberately not inventing a weighting between them; see
 * data/crime-methodology.md.
 *
 * `concern` (0-100) is a PERCENTILE RANK among this dataset's own covered
 * cities, not an absolute severity claim -- a real, documented, and
 * important distinction from allergy's/care-access's scales, which DO
 * claim something closer to absolute severity. Surfaced explicitly in the
 * `detail` string so this is never silently conflated with those.
 */
type CrimeLayer = "violent_crime" | "property_crime";

interface CrimeLayerData {
  rate_per_100k: number;
  concern: number;
}

interface CrimeRecord {
  agency_name: string;
  ori: string;
  violent_crime?: CrimeLayerData;
  property_crime?: CrimeLayerData;
}

const DATA = crimeData as unknown as Record<string, CrimeRecord | { description: string }>;

const LAYER_LABELS: Record<CrimeLayer, string> = {
  violent_crime: "Violent crime",
  property_crime: "Property crime",
};

function getCrimeValue(cityId: string, layerId: string): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record || !("ori" in record)) return null;
  const layer = record[layerId as CrimeLayer];
  if (!layer) return null;

  return {
    value: layer.concern,
    detail: `${layer.rate_per_100k}/100k residents (${layer.concern}th percentile among covered cities)`,
  };
}

export const crimeDataset: Dataset = {
  id: "crime",
  label: "Crime",
  description: "Violent and property crime rates from the real FBI Crime Data Explorer, percentile-ranked across covered cities.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/crime-methodology.md",
  supportsTime: false,
  layers: (Object.keys(LAYER_LABELS) as CrimeLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getCrimeValue,
};
