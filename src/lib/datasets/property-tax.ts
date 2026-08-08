import propertyTaxData from "@data/property-tax.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

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
 * bounded percentage, directly rescaled onto 0-100 (capped at 2.5%, a
 * FIXED cap across every year so a city's rate stays honestly comparable
 * year to year).
 *
 * Real multi-year history (2010-2023), per explicit operator direction
 * to get "as much data as possible" for real trends over time. 2010 is a
 * REAL, verified floor -- table B25103 doesn't exist in the ACS5 2009
 * vintage at all (confirmed live), one year later than the other
 * Census-cluster datasets built around the same time.
 */
interface PropertyTaxYear {
  median_annual_taxes: number;
  median_home_value: number;
  effective_rate_pct: number;
  concern: number;
}

interface PropertyTaxRecord {
  years: Record<string, PropertyTaxYear>;
}

interface PropertyTaxMeta {
  years: number[];
}

const DATA = propertyTaxData as unknown as Record<string, PropertyTaxRecord> & { _meta: PropertyTaxMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getPropertyTaxValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "property_tax_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.effective_rate_pct}% effective property tax rate in ${year} -- $${yearData.median_annual_taxes.toLocaleString()}/year median taxes on a $${yearData.median_home_value.toLocaleString()} median home -- Census ACS`,
  };
}

export const propertyTaxDataset: Dataset = {
  id: "property-tax",
  label: "Property tax",
  description: "Effective property tax rate -- median real estate taxes paid divided by median home value, real Census ACS data, 2010-2023.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/property-tax-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "property_tax_rate", label: "Effective property tax rate" }],
  getValue: getPropertyTaxValue,
};
