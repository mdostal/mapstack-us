import averageWageData from "@data/average-wage.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The thirtieth real Dataset -- average annual wage per employee,
 * tri-2 (tri-bulk-and-data-drive-2 epic, backlog addendum 2 #31). Reuses
 * the exact Census Business Patterns pipeline business-density.ts
 * already proved out -- same API, same CENSUS_API_KEY, same
 * county-level ceiling (CBP has no place-level geography at all) -- just
 * one more real field (PAYANN, total annual payroll) from the same
 * request. See scripts/gen_average_wage_data.py.
 *
 * Genuinely distinct from income.ts (median HOUSEHOLD income -- includes
 * non-wage income, multiple earners per household) and from
 * business-density.ts (establishment COUNT, not pay level): this is real
 * average pay PER EMPLOYEE at local businesses.
 *
 * Real multi-year history (1986-2023), per explicit operator direction
 * to get "as much data as possible" for real trends over time. 1986 is
 * CBP's own real floor; 2024 isn't published yet (a real HTTP 404,
 * confirmed live, a genuine release-lag gap).
 *
 * One layer: real average_wage = PAYANN * 1000 / EMP, percentile-ranked
 * and INVERTED among THAT YEAR's own covered cities -- LOWER average
 * wage is MORE concerning, the same per-year convention crime.ts's
 * multi-year layers use -- not comparable across years, same real
 * caveat.
 */
interface AverageWageYear {
  average_wage: number;
  concern: number;
}

interface AverageWageRecord {
  years: Record<string, AverageWageYear>;
}

interface AverageWageMeta {
  years: number[];
}

const DATA = averageWageData as unknown as Record<string, AverageWageRecord> & { _meta: AverageWageMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getAverageWageValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "average_wage") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `$${yearData.average_wage.toLocaleString()} average annual wage per employee in ${year} -- Census Business Patterns`,
  };
}

export const averageWageDataset: Dataset = {
  id: "average-wage",
  label: "Average wage",
  description: "Real Census Business Patterns average annual wage per employee, county-level, 1986-2023 -- lower wage = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/average-wage-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "average_wage", label: "Average wage" }],
  getValue: getAverageWageValue,
};
