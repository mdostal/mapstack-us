import parksData from "@data/parks.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The thirteenth real Dataset -- park access, sourced from the Trust for
 * Public Land's free, keyless ParkServe database, queried directly from
 * TPL's own hosted ArcGIS FeatureServer at each city's coordinate -- the
 * same "hosted FeatureServer point query" pattern hazard.ts,
 * transit-access.ts, and walkability.ts already use, again sidestepping
 * the "needs real GIS work" objection the dataset backlog research
 * assumed this candidate required. See scripts/gen_parks_data.py.
 *
 * One layer: the real percentage of a place's population living within a
 * 10-minute walk of a park -- ALREADY computed by TPL itself (this
 * project only divides TPL's own two published sums, not raw polygon
 * math), inverted onto the concern scale (concern = 100 - pct_served)
 * since percent-served is already a meaningful 0-100 quantity.
 *
 * A real coordinate-precision gap, fixed the same way transit-access.ts's
 * Urban Area crosswalk was: several narrow/coastal cities (Santa Monica
 * CA, Charleston SC, Miami Beach FL, Kenosha WI) needed a 3km search
 * buffer around their stored coordinate to resolve to their OWN place
 * rather than returning nothing. 507/512 real coverage -- the remaining 5
 * are the same tiny reference towns (Blanding UT, Monticello UT,
 * Whitewright TX, Sundance WY, Geraldine MT) that show up as honest gaps
 * across nearly every dataset this project ships. See
 * data/parks-methodology.md.
 */
interface ParksRecord {
  place_name: string;
  pct_served: number;
  park_count: number;
  total_park_acreage: number;
  concern: number;
}

const DATA = parksData as unknown as Record<string, ParksRecord> & { _meta: unknown };

function getParksValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "park_access") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.pct_served}% of residents within a 10-min walk of a park (${record.park_count} parks, ${record.place_name}) -- Trust for Public Land ParkServe`,
  };
}

export const parksDataset: Dataset = {
  id: "parks",
  label: "Park access",
  description: "Trust for Public Land ParkServe -- percent of residents within a 10-minute walk of a park, higher = less access = more concerning.",
  methodologyUrl: methodologyDocUrl("parks"),
  supportsTime: false,
  layers: [{ id: "park_access", label: "Park access", legendLow: "Good access", legendHigh: "Poor access" }],
  getValue: getParksValue,
};
