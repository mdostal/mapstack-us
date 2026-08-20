import salesTaxData from "@data/sales-tax.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The nineteenth real Dataset -- combined (state + local) sales tax rate,
 * from `.pHive/epics/data-store/docs/dataset-backlog.md` (#23), the
 * second keyless candidate this session shipped alongside heat.ts while
 * the Census-cluster items stay blocked on a missing CENSUS_API_KEY.
 * See scripts/gen_sales_tax_data.py.
 *
 * One layer: the combined rate a resident actually pays at checkout.
 * Two real, genuinely different-vintage source tiers -- city-level
 * (123 cities over 200k population, Tax Foundation's own table dated
 * "as of July 1, 2021") where it exists, a real state-level average
 * fallback (Tax Foundation, "as of January 1, 2026" -- genuinely
 * current) for the rest. 512/512 coverage. Already a meaningful,
 * externally bounded percentage, so directly rescaled onto 0-100
 * (capped at 11% -- see data/sales-tax-methodology.md), not a
 * percentile rank among the spine.
 */
interface SalesTaxRecord {
  combined_rate_pct: number;
  tier: "city" | "state";
  concern: number;
}

const DATA = salesTaxData as unknown as Record<string, SalesTaxRecord> & { _meta: unknown };

function getSalesTaxValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "combined_sales_tax") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const tierNote = record.tier === "city" ? "city rate, as of July 2021" : "state average rate, as of January 2026 -- no city-specific rate published for this city";
  return {
    value: record.concern,
    detail: `${record.combined_rate_pct}% combined state + local sales tax (${tierNote}) -- Tax Foundation`,
  };
}

export const salesTaxDataset: Dataset = {
  id: "sales-tax",
  label: "Sales tax",
  description: "Combined state + local sales tax rate -- Tax Foundation, city-level where published, state average otherwise.",
  methodologyUrl: methodologyDocUrl("sales-tax"),
  supportsTime: false,
  layers: [{ id: "combined_sales_tax", label: "Combined sales tax rate" }],
  getValue: getSalesTaxValue,
};
