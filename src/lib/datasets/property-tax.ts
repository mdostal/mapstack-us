import propertyTaxData from "@data/property-tax.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-third real Dataset -- effective property tax rate, the last
 * of the three real tax candidates from
 * `.pHive/epics/data-store/docs/dataset-backlog.md` (#22), and the FIRST
 * dataset in this project pulled directly from the Census API rather
 * than via County Health Rankings' free republication route -- unblocked
 * by a real, free, self-serve CENSUS_API_KEY. See
 * scripts/gen_property_tax_data.py.
 *
 * One layer: median annual real estate taxes paid divided by median home
 * value (Census ACS tables B25103/B25077), the same effective-rate
 * construction the backlog itself specifies. Already a meaningful,
 * bounded percentage, directly rescaled onto 0-100 (capped at 2.5% --
 * the real observed spine max, Trenton NJ, sits at 3.43%, so a handful
 * of the highest-burden cities clamp to 100, an honest "most burdened"
 * read). 508/512 real coverage.
 */
interface PropertyTaxRecord {
  median_annual_taxes: number;
  median_home_value: number;
  effective_rate_pct: number;
  concern: number;
}

const DATA = propertyTaxData as unknown as Record<string, PropertyTaxRecord> & { _meta: unknown };

function getPropertyTaxValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "property_tax_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.effective_rate_pct}% effective property tax rate -- $${record.median_annual_taxes.toLocaleString()}/year median taxes on a $${record.median_home_value.toLocaleString()} median home -- Census ACS`,
  };
}

export const propertyTaxDataset: Dataset = {
  id: "property-tax",
  label: "Property tax",
  description: "Effective property tax rate -- median real estate taxes paid divided by median home value, real Census ACS data.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/property-tax-methodology.md",
  supportsTime: false,
  layers: [{ id: "property_tax_rate", label: "Effective property tax rate" }],
  getValue: getPropertyTaxValue,
};
