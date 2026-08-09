import businessDensityData from "@data/business-density.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

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
 * Real multi-year history (2009-2023), per explicit operator direction
 * to get "as much data as possible" for real trends over time. CBP's own
 * ESTAB field goes back to 1986, but the real floor here is bounded by
 * the ACS5 population denominator used to normalize it (B01003 at county
 * level starts at the 2009 vintage, ACS5's first-ever window).
 *
 * One layer: real establishment count normalized by real county
 * population (establishments per 1,000 residents), percentile-ranked and
 * INVERTED among THAT YEAR's own covered cities -- LOWER business
 * density is MORE concerning (reads as reduced local economic activity),
 * the same per-year convention crime.ts's multi-year layers use -- not
 * comparable across years, same real caveat.
 */
interface BusinessDensityYear {
  establishments_per_1000: number;
  concern: number;
}

interface BusinessDensityRecord {
  years: Record<string, BusinessDensityYear>;
}

interface BusinessDensityMeta {
  years: number[];
}

const DATA = businessDensityData as unknown as Record<string, BusinessDensityRecord> & { _meta: BusinessDensityMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getBusinessDensityValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "business_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.establishments_per_1000.toFixed(1)} business establishments per 1,000 residents in ${year} -- Census Business Patterns`,
  };
}

export const businessDensityDataset: Dataset = {
  id: "business-density",
  label: "Business density",
  description: "Real Census Business Patterns establishment density, county-level, 2009-2023 -- lower density = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/business-density-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "business_density", label: "Business density" }],
  getValue: getBusinessDensityValue,
};
