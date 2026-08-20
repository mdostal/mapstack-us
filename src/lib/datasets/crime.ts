import crimeData from "@data/crime.json";
import { toOrdinal } from "@/lib/datasets/format";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

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
 * Real multi-year history (2010-2025, scripts/gen_crime_data.py, extended
 * from an original 2020-2025 range per a later explicit request for "the
 * last 10-20 years"), per explicit user direction that every dataset
 * should carry "dates and years and historical data like the allergy
 * one" -- generalizes allergy-locator's TimeframeControl/YearPlayback
 * pattern via `context.year` and `availableYears` rather than
 * allergy-specific month/day season curves, since crime data's real
 * temporal resolution is annual, not day-level.
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
    // Real bug found live by this project's own QA sweep, fixed: this
    // detail string previously always hardcoded "th" (e.g. "82.1th
    // percentile" for any value not ending in a bare 4-9), and omitted an
    // inline source attribution unlike hate-crime.ts's sibling FBI-sourced
    // detail string.
    detail: `${layer.rate_per_100k}/100k residents in ${year} (${toOrdinal(layer.concern)} percentile among that year's covered cities) -- FBI Crime Data Explorer`,
  };
}

export const crimeDataset: Dataset = {
  id: "crime",
  label: "Crime",
  description: "Violent and property crime rates from the real FBI Crime Data Explorer, percentile-ranked across covered cities each year.",
  methodologyUrl: methodologyDocUrl("crime"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: (Object.keys(LAYER_LABELS) as CrimeLayer[]).map((id) => ({ id, label: LAYER_LABELS[id] })),
  getValue: getCrimeValue,
};
