import businessDensityData from "@data/business-density.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-ninth real Dataset -- business establishment density, dvd-6
 * (dataset-verification-drive epic). Pivoted here after EPA TRI (the
 * originally-planned pick) turned out impractically slow to bulk-fetch
 * live -- see `.pHive/epics/data-store/docs/dataset-backlog.md`'s
 * addendum for the real feasibility finding. See
 * scripts/gen_business_density_data.py.
 *
 * Census Business Patterns has NO place-level geography at all (confirmed
 * live) -- county-level only, reusing the same city->county crosswalk
 * hazard.ts/unemployment.ts/cost-of-living.ts already use, but with no
 * city-level tier above it this time (unlike unemployment's two-tier
 * fallback).
 *
 * One layer: real establishment count normalized by real county
 * population (establishments per 1,000 residents), percentile-ranked and
 * INVERTED among covered cities -- LOWER business density is MORE
 * concerning (reads as reduced local economic activity), the same
 * convention income.ts/housing-inventory.ts already use for their own
 * unbounded raw quantities.
 */
interface BusinessDensityRecord {
  establishments_per_1000: number;
  county: string;
  concern: number;
}

const DATA = businessDensityData as unknown as Record<string, BusinessDensityRecord> & { _meta: unknown };

function getBusinessDensityValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "business_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.establishments_per_1000.toFixed(1)} business establishments per 1,000 residents (${record.county} County) -- Census Business Patterns`,
  };
}

export const businessDensityDataset: Dataset = {
  id: "business-density",
  label: "Business density",
  description: "Real Census Business Patterns establishment density -- county-level, lower density = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/business-density-methodology.md",
  supportsTime: false,
  layers: [{ id: "business_density", label: "Business density" }],
  getValue: getBusinessDensityValue,
};
