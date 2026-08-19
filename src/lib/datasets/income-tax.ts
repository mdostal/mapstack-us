import incomeTaxData from "@data/income-tax.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The twenty-first real Dataset -- state individual income tax rate,
 * the second of the three real tax candidates from
 * `.pHive/epics/data-store/docs/dataset-backlog.md` (#24), after sales
 * tax (#23) and before property tax (#22). No API key -- reuses sales-tax.ts's stdlib-only OOXML
 * reader. Extended to real multi-year history 2015-2023 (ddr-tax-
 * extend, this session) -- the same current xlsx download turns out to
 * be a real consolidated workbook with one sheet per year (2015-2026);
 * this dataset's real usable range is capped to the overlap with
 * income.ts's own real median-income years (2009-2023), since each
 * year's tax bracket is matched against THAT SAME year's real median
 * income, not always the latest of either series. See
 * scripts/gen_income_tax_data.py.
 *
 * One layer: the state income tax rate that actually applies at each
 * city's own real median household income for a given real year
 * (income.ts's already-shipped Census ACS data) -- NOT the top marginal
 * bracket, which the backlog itself warns would overstate burden for a
 * typical resident. State-level only, the real, honest limit of this
 * candidate: every spine city in a state with a broad-based income tax
 * gets the identical number, the same "reflects your state, not your
 * city" gap political-lean.ts already carries. Nine states (AK, FL, NH,
 * NV, SD, TN, TX, WA, WY) correctly report 0 -- real, not a missing
 * value.
 */
interface IncomeTaxYear {
  applicable_rate_pct: number;
  at_median_income: number;
  concern: number;
}

interface IncomeTaxRecord {
  years: Record<string, IncomeTaxYear>;
}

interface IncomeTaxMeta {
  years: number[];
}

const DATA = incomeTaxData as unknown as Record<string, IncomeTaxRecord> & { _meta: IncomeTaxMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getIncomeTaxValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "state_income_tax") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.applicable_rate_pct}% state income tax rate at this city's real ${year} median household income ($${yearData.at_median_income.toLocaleString()}) -- Tax Foundation, reflects the whole state, not just this city`,
  };
}

export const incomeTaxDataset: Dataset = {
  id: "income-tax",
  label: "State income tax",
  description: "State individual income tax rate applicable at each city's real median household income, 2015-2023 -- Tax Foundation, state-level only.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/income-tax-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "state_income_tax", label: "State income tax" }],
  getValue: getIncomeTaxValue,
};
