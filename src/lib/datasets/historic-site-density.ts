import historicSiteDensityData from "@data/historic-site-density.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-ninth real Dataset -- density of National Register of Historic
 * Places (NRHP)-listed sites within 10 miles of each city, ddr10-1
 * (data-drive-round-10 epic). Real, live, keyless NPS ArcGIS FeatureServer
 * (mapservices.nps.gov/.../cultural_resources/nrhp_locations), 72,668 real
 * listed resources nationally. See scripts/gen_historic_site_density_data.py.
 *
 * A first for this session's radius-join pattern: the server itself
 * supports a spatial distance query, so this is one HTTP request per city
 * returning an exact count -- no bulk download, no local haversine (unlike
 * tri-facility-density.ts and library-access.ts, which download a national
 * file and join client-side). The source's own City/State field is
 * unreliable (confirmed live: City='NEW YORK' AND State='NY' returns
 * count=0) so the radius join is required, not optional.
 *
 * One layer: real count of NRHP sites within 10mi, direct rescale INVERTED
 * (fewer nearby historic sites = more concerning, an "access"-style framing
 * matching parks.ts/library-access.ts/transit-access.ts) and capped at a
 * real, checked p90 (290). 512/512 real coverage -- a 0-count response is a
 * valid real value (a real, verified answer, not a missing-data null).
 */
interface HistoricSiteDensityRecord {
  count_within_10mi: number;
  concern: number;
}

const DATA = historicSiteDensityData as unknown as Record<string, HistoricSiteDensityRecord> & { _meta: unknown };

function getHistoricSiteDensityValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "historic_site_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const siteWord = record.count_within_10mi === 1 ? "site" : "sites";
  return {
    value: record.concern,
    detail: `${record.count_within_10mi} National Register of Historic Places ${siteWord} within 10 miles -- NPS National Register of Historic Places`,
  };
}

export const historicSiteDensityDataset: Dataset = {
  id: "historic-site-density",
  label: "Historic site access",
  description: "Real NPS National Register of Historic Places density within 10mi -- fewer nearby sites = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/historic-site-density-methodology.md",
  supportsTime: false,
  layers: [{ id: "historic_site_density", label: "Historic site access" }],
  getValue: getHistoricSiteDensityValue,
};
