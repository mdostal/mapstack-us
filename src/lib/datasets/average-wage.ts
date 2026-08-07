import averageWageData from "@data/average-wage.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-first real Dataset -- average annual wage per employee,
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
 * One layer: real average_wage = PAYANN * 1000 / EMP, percentile-ranked
 * and INVERTED among covered cities -- LOWER average wage is MORE
 * concerning, the same convention income.ts already uses for a related
 * concept. 512/512 real coverage.
 */
interface AverageWageRecord {
  average_wage: number;
  county: string;
  concern: number;
}

const DATA = averageWageData as unknown as Record<string, AverageWageRecord> & { _meta: unknown };

function getAverageWageValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "average_wage") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `$${record.average_wage.toLocaleString()} average annual wage per employee (${record.county} County) -- Census Business Patterns`,
  };
}

export const averageWageDataset: Dataset = {
  id: "average-wage",
  label: "Average wage",
  description: "Real Census Business Patterns average annual wage per employee -- county-level, lower wage = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/average-wage-methodology.md",
  supportsTime: false,
  layers: [{ id: "average_wage", label: "Average wage" }],
  getValue: getAverageWageValue,
};
