import crimeData from "@data/crime.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

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
 * `concern` (0-100) is a PERCENTILE RANK among THAT YEAR's own covered
 * cities, not an absolute severity claim, and not comparable across years
 * -- a real, documented distinction from allergy's/care-access's scales.
 * Surfaced explicitly in the `detail` string so this is never silently
 * conflated with those.
 *
 * Real multi-year history (2020-2024, scripts/gen_crime_data.py), per
 * explicit user direction that every dataset should carry "dates and
 * years and historical data like the allergy one" -- generalizes
 * allergy-locator's TimeframeControl/YearPlayback pattern via
 * `context.year` and `availableYears` rather than allergy-specific
 * month/day season curves, since crime data's real temporal resolution is
 * annual, not day-level.
 */
type CrimeLayer = "violent_crime" | "property_crime";

interface CrimeLayerData {
  rate_per_100k: number;
  concern: number;
}

interface CrimeYearData {
  violent_crime?: CrimeLayerData;
  property_crime?: CrimeLayerData;
}

interface CrimeRecord {
  agency_name: string;
  ori: string;
  years: Record<string, CrimeYearData>;
}

interface CrimeMeta {
  years: number[];
}

const DATA = crimeData as unknown as Record<string, CrimeRecord> & { _meta: CrimeMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

const LAYER_LABELS: Record<CrimeLayer, string> = {
  violent_crime: "Violent crime",
  property_crime: "Property crime",
};

function getCrimeValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  const record = DATA[cityId];
  if (!record || !("ori" in record)) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const layer = yearData[layerId as CrimeLayer];
  if (!layer) return null;

  return {
    value: layer.concern,
    detail: `${layer.rate_per_100k}/100k residents in ${year} (${layer.concern}th percentile among that year's covered cities)`,
  };
}

export const crimeDataset: Dataset = {
  id: "crime",
  label: "Crime",
  description: "Violent and property crime rates from the real FBI Crime Data Explorer, percentile-ranked across covered cities each year.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/crime-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: (Object.keys(LAYER_LABELS) as CrimeLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getCrimeValue,
};
