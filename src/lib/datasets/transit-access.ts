import transitAccessData from "@data/transit-access.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The eleventh real Dataset -- public transit service level, sourced from
 * the FTA's free, keyless National Transit Database (NTD), joined at
 * Census Urban Area level via a real ID-matched crosswalk
 * (scripts/geocode_city_urban_areas.py, querying Census's own
 * authoritative TIGERweb "2020 Urban Areas" layer directly -- NOT a
 * fuzzy match against NTD's own multi-city `uza_name` text, which this
 * session tested and found only reaches ~52% of the spine while silently
 * misclassifying real suburbs as having no transit at all). See
 * scripts/gen_transit_access_data.py.
 *
 * One layer: real vehicle-revenue-miles reported by every NTD agency
 * serving a city's urban area (summed across bus/rail/vanpool/demand-
 * response), normalized by the urban area's population, INVERTED via
 * percentile rank among covered cities -- LOWER service per capita is
 * MORE concerning, same "invert toward the concerning direction"
 * convention housing-inventory.ts/days-on-market.ts already use.
 *
 * A real, honestly-documented limitation: a handful of cities served by
 * a REGIONAL agency headquartered in a neighboring urban area (confirmed:
 * Provo/Orem/Ogden/Layton UT, all genuinely served by Utah Transit
 * Authority, which reports its entire service under Salt Lake City's
 * urban area in NTD, not its own) show no data here -- NTD attributes an
 * agency's service to ONE primary urban area, not every area it actually
 * serves. Honestly null, not a fabricated value -- see
 * data/transit-access-methodology.md.
 */
interface TransitAccessRecord {
  urban_area: string;
  vrm_per_capita: number;
  uza_population: number;
  concern: number;
}

const DATA = transitAccessData as unknown as Record<string, TransitAccessRecord> & { _meta: unknown };

function getTransitAccessValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "service_level") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.vrm_per_capita.toFixed(2)} transit vehicle-revenue-miles per resident/year, ${record.urban_area} -- FTA National Transit Database`,
  };
}

export const transitAccessDataset: Dataset = {
  id: "transit-access",
  label: "Transit access",
  description: "Public transit service level (vehicle-revenue-miles per resident) -- FTA National Transit Database, joined by real Census Urban Area.",
  methodologyUrl: methodologyDocUrl("transit-access"),
  supportsTime: false,
  layers: [{ id: "service_level", label: "Transit service level", legendLow: "High service", legendHigh: "Low service" }],
  getValue: getTransitAccessValue,
};
