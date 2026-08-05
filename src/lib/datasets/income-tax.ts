import incomeTaxData from "@data/income-tax.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-second real Dataset -- state individual income tax rate,
 * the last of the three real tax candidates from
 * `.pHive/epics/data-store/docs/dataset-backlog.md` (#24), after sales
 * tax (#23). No API key -- reuses sales-tax.ts's stdlib-only OOXML
 * reader. See scripts/gen_income_tax_data.py.
 *
 * One layer: the state income tax rate that actually applies at each
 * city's own real median household income (income.ts's already-shipped
 * Census ACS data) -- NOT the top marginal bracket, which the backlog
 * itself warns would overstate burden for a typical resident. State-level
 * only, the real, honest limit of this candidate: every spine city in a
 * state with a broad-based income tax gets the identical number, the same
 * "reflects your state, not your city" gap political-lean.ts already
 * carries. Nine states (AK, FL, NH, NV, SD, TN, TX, WA, WY) correctly
 * report 0 -- real, not a missing value.
 */
interface IncomeTaxRecord {
  applicable_rate_pct: number;
  at_median_income: number;
  concern: number;
}

const DATA = incomeTaxData as unknown as Record<string, IncomeTaxRecord> & { _meta: unknown };

function getIncomeTaxValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "state_income_tax") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.applicable_rate_pct}% state income tax rate at this city's real median household income ($${record.at_median_income.toLocaleString()}) -- Tax Foundation, reflects the whole state, not just this city`,
  };
}

export const incomeTaxDataset: Dataset = {
  id: "income-tax",
  label: "State income tax",
  description: "State individual income tax rate applicable at each city's real median household income -- Tax Foundation, state-level only.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/income-tax-methodology.md",
  supportsTime: false,
  layers: [{ id: "state_income_tax", label: "State income tax" }],
  getValue: getIncomeTaxValue,
};
