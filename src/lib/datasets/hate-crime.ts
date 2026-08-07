import hateCrimeData from "@data/hate-crime.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-third real Dataset -- FBI hate crime statistics, ddr4-1
 * (data-drive-round-4 epic). Resolves a lead deferred across THREE prior
 * research rounds this session -- the blocker was never the offense
 * code (every guess against crime.ts's summarized/agency/{ori}/{offense}
 * shape failed); hate crime is a genuinely separate resource tree with
 * its own {bias} path parameter, found by rendering FBI CDE's JS-based
 * docs page via a real browser (unreadable via plain curl). See
 * scripts/gen_hate_crime_data.py.
 *
 * Reuses crime.ts's existing 509-city ORI crosswalk and cached
 * per-agency population data entirely -- zero new geocoding or
 * population fetch.
 *
 * One layer: real incidents per 100k population, direct rescale capped
 * at a data-informed ceiling, higher = more concerning. 471/512 real
 * coverage -- an agency whose real cached population data (from
 * crime.ts's own multi-year build) doesn't cover any of the 6 years
 * tried has no real rate to report, same "real coverage grows over
 * time" honesty crime.ts already documents.
 */
interface HateCrimeRecord {
  incidents: number;
  rate_per_100k: number;
  agency_name: string;
  year: number;
  score: number;
}

const DATA = hateCrimeData as unknown as Record<string, HateCrimeRecord> & { _meta: unknown };

function getHateCrimeValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "hate_crime_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.score,
    detail: `${record.incidents} reported hate crime incidents (${record.rate_per_100k}/100k) in ${record.year} -- FBI Crime Data Explorer, ${record.agency_name}`,
  };
}

export const hateCrimeDataset: Dataset = {
  id: "hate-crime",
  label: "Hate crime rate",
  description: "Real FBI hate crime statistics -- voluntary agency reporting, higher rate = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/hate-crime-methodology.md",
  supportsTime: false,
  layers: [{ id: "hate_crime_rate", label: "Hate crime rate" }],
  getValue: getHateCrimeValue,
};
