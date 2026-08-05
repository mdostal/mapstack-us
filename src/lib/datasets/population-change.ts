import populationChangeData from "@data/population-change.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-sixth real Dataset -- population growth/decline
 * (`.pHive/epics/data-store/docs/dataset-backlog.md` #1), the LAST of
 * the original five Census-cluster items, unblocked by a real, free,
 * self-serve CENSUS_API_KEY. See scripts/gen_population_change_data.py.
 *
 * A real detour: Census's own PEP place-level population product (the
 * backlog's original pick) appears to have moved/been restructured for
 * recent vintages -- confirmed live, its own geography.json for the most
 * recent still-catalogued vintage lists only state-level geography, no
 * place. Uses two non-overlapping ACS 5-year windows instead (2018 vs
 * 2023 vintage) -- still real Census data, a genuine 5-year population
 * comparison, just not PEP's annual cadence.
 *
 * One layer: percent population change. Per the backlog's own explicit
 * framing, DECLINE is the concerning pole -- growth isn't automatically
 * "good" either (real housing/infrastructure strain), but this ships the
 * initial concerning pole only. Flat-or-growing cities score 0 concern;
 * declining cities are directly rescaled by how much they declined,
 * capped at 10% (a handful of real, steep-decline cities like
 * Monticello UT and Flint MI clamp to 100). 508/512 coverage.
 */
interface PopulationChangeRecord {
  population_2018: number;
  population_2023: number;
  pct_change: number;
  concern: number;
}

const DATA = populationChangeData as unknown as Record<string, PopulationChangeRecord> & { _meta: unknown };

function getPopulationChangeValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "population_change") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const direction = record.pct_change >= 0 ? "growth" : "decline";
  return {
    value: record.concern,
    detail: `${record.pct_change >= 0 ? "+" : ""}${record.pct_change}% population ${direction} over 5 years (${record.population_2018.toLocaleString()} → ${record.population_2023.toLocaleString()}) -- Census ACS`,
  };
}

export const populationChangeDataset: Dataset = {
  id: "population-change",
  label: "Population change",
  description: "5-year population growth or decline -- real Census ACS data, decline is the concerning pole.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/population-change-methodology.md",
  supportsTime: false,
  layers: [{ id: "population_change", label: "Population growth/decline" }],
  getValue: getPopulationChangeValue,
};
