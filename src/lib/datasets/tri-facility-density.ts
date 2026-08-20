import triFacilityDensityData from "@data/tri-facility-density.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The twenty-ninth real Dataset -- EPA Toxics Release Inventory (TRI)
 * facility density, tri-1 (tri-bulk-and-data-drive-2 epic), extended to
 * real multi-year history 1987-2024 (ddr-tri-extend, this session).
 *
 * A first extension attempt fetched EPA's purpose-built per-year bulk CSV
 * (one giant pre-generated national file per year) -- this worked for
 * smaller-file years but hit a real, then-current, broad server-side wall
 * (~950-1070s cutoff regardless of client timeout or even file size,
 * confirmed via an extensive live investigation including a small
 * single-state test that still hit the same wall) for many mid-range
 * years. The real fix: EPA's Envirofacts REST API exposes the same
 * answer via two much smaller, parallelizable queries instead of one
 * giant file -- `tri_facility` (the cumulative facility registry,
 * TRIFD + lat/lon, fetched ONCE since locations don't change) and
 * `tri_reporting_form` filtered by `reporting_year` (which facilities
 * reported that year), each fetched via many concurrent row-window
 * requests. See scripts/gen_tri_facility_density_data.py.
 *
 * No crosswalk needed: `data/cities.json` has real lat/lon per city, and
 * the registry has real lat/lon per facility, so this joins by real
 * geographic proximity (haversine), not FIPS.
 *
 * One layer: real count of TRI-reporting facilities within a 10-mile
 * radius, direct rescale capped at a FIXED count (70 -- the real 2024 p90
 * is 66, padded slightly, see scripts/gen_tri_facility_density_data.py's
 * own COUNT_CAP comment) across every year so a city's density stays honestly comparable
 * year to year -- higher count = more concerning. 512/512 real coverage,
 * full real range 1987-2024, no disclosed gaps.
 */
interface TriFacilityDensityYear {
  facility_count: number;
  concern: number;
}

interface TriFacilityDensityRecord {
  years: Record<string, TriFacilityDensityYear>;
}

interface TriFacilityDensityMeta {
  years: number[];
}

const DATA = triFacilityDensityData as unknown as Record<string, TriFacilityDensityRecord> & { _meta: TriFacilityDensityMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getTriFacilityDensityValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "tri_facility_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.facility_count} TRI-reporting facilities within 10 miles as of ${year} -- EPA Toxics Release Inventory`,
  };
}

export const triFacilityDensityDataset: Dataset = {
  id: "tri-facility-density",
  label: "Industrial facility density",
  description: "Real EPA Toxics Release Inventory facility proximity, 1987-2024 -- higher density of reporting facilities nearby = more concerning.",
  methodologyUrl: methodologyDocUrl("tri-facility-density"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "tri_facility_density", label: "Industrial facility density" }],
  getValue: getTriFacilityDensityValue,
};
