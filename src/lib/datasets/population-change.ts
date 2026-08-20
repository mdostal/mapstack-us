import populationChangeData from "@data/population-change.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twenty-fifth real Dataset -- population growth/decline
 * (`.pHive/epics/data-store/docs/dataset-backlog.md` #1), the LAST of
 * the original five Census-cluster items. See
 * scripts/gen_population_change_data.py.
 *
 * Real multi-year history (2001-2023, year-over-year % change), a
 * genuine upgrade over the original single 2018-vs-2023 comparison, per
 * explicit operator direction to get "as much data as possible" for
 * real trends over time. Stitched from THREE real, distinct Census
 * sources at their real boundaries: 2001-2009 from the real annual
 * `2000/pep/int_population` intercensal product, 2010-2019 from the real
 * annual `2019/pep/population` postcensal product, and 2020-2023 from
 * ACS5 vintage-year population (B01003) -- Census's own PEP place-level
 * product was confirmed live to have no place-level geography for any
 * post-2020 vintage, a real, disclosed methodology seam: 2020+ figures
 * compare overlapping ACS5 5-year windows, not true annual snapshots
 * like the PEP-sourced years before them.
 *
 * One layer: per the backlog's own explicit framing, DECLINE is the
 * concerning pole -- growth isn't automatically "good" either (real
 * housing/infrastructure strain), but this ships the initial concerning
 * pole only. Flat-or-growing years score 0 concern; a declining year is
 * directly rescaled by how steep that year's decline was, capped at a
 * data-informed ceiling (see the methodology doc for the real observed
 * range this build produced).
 */
interface PopulationChangeYear {
  population: number;
  pct_change: number;
  concern: number;
}

interface PopulationChangeRecord {
  years: Record<string, PopulationChangeYear>;
}

interface PopulationChangeMeta {
  years: number[];
}

const DATA = populationChangeData as unknown as Record<string, PopulationChangeRecord> & { _meta: PopulationChangeMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getPopulationChangeValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "population_change") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const direction = yearData.pct_change >= 0 ? "growth" : "decline";
  return {
    value: yearData.concern,
    detail: `${yearData.pct_change >= 0 ? "+" : ""}${yearData.pct_change}% population ${direction} in ${year} (population ${yearData.population.toLocaleString()}) -- Census`,
  };
}

export const populationChangeDataset: Dataset = {
  id: "population-change",
  label: "Population change",
  description: "Year-over-year population growth or decline, real Census data, 2001-2023 -- decline is the concerning pole.",
  methodologyUrl: methodologyDocUrl("population-change"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [
    {
      id: "population_change",
      label: "Population growth/decline",
      legendLow: "Population growth",
      legendHigh: "Population decline",
    },
  ],
  getValue: getPopulationChangeValue,
};
