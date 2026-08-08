import libraryAccessData from "@data/library-access.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-sixth real Dataset -- public library access, ddr7-1
 * (data-drive-round-7 epic). Resolves the IMLS Public Libraries Survey,
 * deferred twice this session -- found via IMLS's own site structure, a
 * real static bulk CSV download (no API/key needed). See
 * scripts/gen_library_access_data.py.
 *
 * A real join-strategy lesson learned twice this session: the source
 * file's own CITY/STABR fields are administrative addresses, not
 * service areas (114/512 spine cities, including Minneapolis MN, have
 * zero match by name) -- uses a 10-mile radius join against each city's
 * own real lat/lon instead (100% of the file's library-system rows have
 * valid coordinates), the same pattern tri-facility-density.ts/
 * drought.ts already established.
 *
 * One layer: real library visits per capita (summed across every real
 * library system within radius, divided by their real combined
 * population served), percentile-ranked and INVERTED among covered
 * cities -- LOWER visits per capita is MORE concerning, a public-good-
 * access framing matching parks.ts/transit-access.ts/walkability.ts's
 * existing convention. 478/512 real coverage.
 */
interface LibraryAccessRecord {
  visits_per_capita: number;
  systems_nearby: number;
  year: string;
  score: number;
}

const DATA = libraryAccessData as unknown as Record<string, LibraryAccessRecord> & { _meta: unknown };

function getLibraryAccessValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "library_access") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const systemWord = record.systems_nearby === 1 ? "system" : "systems";
  return {
    value: record.score,
    detail: `${record.visits_per_capita} library visits per resident per year (${record.systems_nearby} ${systemWord} within 10 miles, ${record.year}) -- IMLS Public Libraries Survey`,
  };
}

export const libraryAccessDataset: Dataset = {
  id: "library-access",
  label: "Library access",
  description: "Real IMLS library visits per capita -- lower access = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/library-access-methodology.md",
  supportsTime: false,
  layers: [{ id: "library_access", label: "Library access", legendLow: "Good access", legendHigh: "Poor access" }],
  getValue: getLibraryAccessValue,
};
