import hateCrimeData from "@data/hate-crime.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The thirty-second real Dataset -- FBI hate crime statistics, ddr4-1
 * (data-drive-round-4 epic). Resolves a lead deferred across THREE prior
 * research rounds this session -- the blocker was never the offense
 * code (every guess against crime.ts's summarized/agency/{ori}/{offense}
 * shape failed); hate crime is a genuinely separate resource tree with
 * its own {bias} path parameter, found by rendering FBI CDE's JS-based
 * docs page via a real browser (unreadable via plain curl). See
 * scripts/gen_hate_crime_data.py.
 *
 * Reuses crime.ts's existing 509-city ORI crosswalk and cached
 * per-agency population data entirely -- zero new geocoding.
 *
 * Real multi-year history (2010-2025), per explicit operator direction
 * to get "as much data as possible" for real trends over time.
 * Deliberately scoped to match crime.ts's own real range -- the
 * hate-crime endpoint itself carries no population field, so a real
 * denominator has to come from crime.ts's own per-year population
 * cache, which covers exactly 2010-2025. Reaching further back
 * (hate-crime data theoretically exists to 1991) would need a genuinely
 * separate population fetch for years crime.ts doesn't cover, for what's
 * likely much sparser voluntary reporting -- not attempted here.
 *
 * One layer: real incidents per 100k population per year, direct
 * rescale capped at a FIXED data-informed ceiling across every year (so
 * a city's rate stays honestly comparable year to year), higher = more
 * concerning.
 */
interface HateCrimeYear {
  incidents: number;
  rate_per_100k: number;
  score: number;
}

interface HateCrimeRecord {
  agency_name: string;
  years: Record<string, HateCrimeYear>;
}

interface HateCrimeMeta {
  years: number[];
}

const DATA = hateCrimeData as unknown as Record<string, HateCrimeRecord> & { _meta: HateCrimeMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getHateCrimeValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "hate_crime_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.score,
    detail: `${yearData.incidents} reported hate crime incidents (${yearData.rate_per_100k}/100k) in ${year} -- FBI Crime Data Explorer, ${record.agency_name}`,
  };
}

export const hateCrimeDataset: Dataset = {
  id: "hate-crime",
  label: "Hate crime rate",
  description: "Real FBI hate crime statistics, 2010-2025 -- voluntary agency reporting, higher rate = more concerning.",
  methodologyUrl: methodologyDocUrl("hate-crime"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "hate_crime_rate", label: "Hate crime rate" }],
  getValue: getHateCrimeValue,
};
