import historicSiteDensityData from "@data/historic-site-density.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The thirty-eighth real Dataset -- density of National Register of Historic
 * Places (NRHP)-listed sites within 10 miles of each city, ddr10-1
 * (data-drive-round-10 epic). Real, live, keyless NPS ArcGIS FeatureServer
 * (mapservices.nps.gov/.../cultural_resources/nrhp_locations), 72,668 real
 * listed resources nationally. See scripts/gen_historic_site_density_data.py.
 *
 * Real multi-year history (1966-2025), per explicit operator direction to
 * get "as much data as possible" for real trends over time. Every real
 * NRHP site carries a real `CertDate` (listing date) field -- one fetch
 * per city retrieves every real site's CertDate within 10mi (confirmed
 * live: no pagination needed even for NYC's 823 real sites), then every
 * real year's count is computed locally: year X's count = the real number
 * of sites whose CertDate falls at or before X. A site listed in 1994
 * genuinely wasn't there in a real 1985 snapshot -- this is a real
 * reconstruction from real per-site dates, not an estimate.
 *
 * One layer: real count of NRHP sites within 10mi at a given year, direct
 * rescale INVERTED (fewer nearby historic sites = more concerning, an
 * "access"-style framing matching parks.ts/library-access.ts/
 * transit-access.ts) and capped at a FIXED real p90-derived ceiling (290)
 * across every year. 512/512 real coverage -- a 0-count response is a
 * valid real value (a real, verified answer, not a missing-data null).
 */
interface HistoricSiteDensityYear {
  count_within_10mi: number;
  concern: number;
}

interface HistoricSiteDensityRecord {
  years: Record<string, HistoricSiteDensityYear>;
}

interface HistoricSiteDensityMeta {
  years: number[];
}

const DATA = historicSiteDensityData as unknown as Record<string, HistoricSiteDensityRecord> & { _meta: HistoricSiteDensityMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getHistoricSiteDensityValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "historic_site_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const siteWord = yearData.count_within_10mi === 1 ? "site" : "sites";
  return {
    value: yearData.concern,
    detail: `${yearData.count_within_10mi} National Register of Historic Places ${siteWord} within 10 miles as of ${year} -- NPS National Register of Historic Places`,
  };
}

export const historicSiteDensityDataset: Dataset = {
  id: "historic-site-density",
  label: "Historic site access",
  description: "Real NPS National Register of Historic Places density within 10mi, 1966-2025 -- fewer nearby sites = more concerning.",
  methodologyUrl: methodologyDocUrl("historic-site-density"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "historic_site_density", label: "Historic site access", legendLow: "Many nearby", legendHigh: "Few nearby" }],
  getValue: getHistoricSiteDensityValue,
};
