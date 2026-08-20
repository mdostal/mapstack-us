import libraryAccessData from "@data/library-access.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The thirty-fifth real Dataset -- public library access, ddr7-1
 * (data-drive-round-7 epic), extended to real multi-year history
 * 2007-2024 (ddr-library-extend, this session).
 *
 * IMLS publishes the Public Libraries Survey as a real static bulk CSV
 * per fiscal year back to 1992 (found by rendering imls.gov's own PLS
 * survey page with a real browser and reading off every year's real
 * download link -- the URL naming convention changes across three real
 * eras with no predictable pattern). Real floor for THIS dataset's
 * radius-join method: FY2007 -- a live per-year column check found
 * FY2006 and every earlier year's file has no LATITUDE/LONGITUD columns
 * at all (only administrative CITY/STABR fields, already known from the
 * original single-year build to fail for 114/512 spine cities by exact
 * name match). 1992-2006 are honestly out of scope for this join method
 * rather than backfilled with a worse join. See
 * scripts/gen_library_access_data.py.
 *
 * A real join-strategy lesson learned twice this session: the source
 * file's own CITY/STABR fields are administrative addresses, not
 * service areas -- uses a 10-mile radius join against each city's own
 * real lat/lon instead, the same pattern tri-facility-density.ts/
 * drought.ts already established.
 *
 * One layer: real library visits per capita (summed across every real
 * library system within radius, divided by their real combined
 * population served), percentile-ranked and INVERTED independently PER
 * YEAR among that year's own covered cities (same convention as
 * income.ts/crime.ts for unbounded raw quantities -- not comparable
 * across years) -- LOWER visits per capita is MORE concerning, a
 * public-good-access framing matching parks.ts/transit-access.ts/
 * walkability.ts's existing convention.
 */
interface LibraryAccessYear {
  visits_per_capita: number;
  systems_nearby: number;
  score: number;
}

interface LibraryAccessRecord {
  years: Record<string, LibraryAccessYear>;
}

interface LibraryAccessMeta {
  years: number[];
}

const DATA = libraryAccessData as unknown as Record<string, LibraryAccessRecord> & { _meta: LibraryAccessMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getLibraryAccessValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "library_access") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const systemWord = yearData.systems_nearby === 1 ? "system" : "systems";
  return {
    value: yearData.score,
    detail: `${yearData.visits_per_capita} library visits per resident per year (${yearData.systems_nearby} ${systemWord} within 10 miles, ${year}) -- IMLS Public Libraries Survey`,
  };
}

export const libraryAccessDataset: Dataset = {
  id: "library-access",
  label: "Library access",
  description: "Real IMLS library visits per capita, 2007-2024 -- lower access = more concerning.",
  methodologyUrl: methodologyDocUrl("library-access"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "library_access", label: "Library access", legendLow: "Good access", legendHigh: "Poor access" }],
  getValue: getLibraryAccessValue,
};
