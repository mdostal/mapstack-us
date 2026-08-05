import unemploymentData from "@data/unemployment.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-fourth real Dataset -- local unemployment rate
 * (`.pHive/epics/data-store/docs/dataset-backlog.md` #11), unblocked by
 * a real, free, self-serve BLS_API_KEY
 * (https://data.bls.gov/registrationEngine/). See
 * scripts/gen_unemployment_data.py -- BLS's own area-code reference file
 * is bot-blocked, so series IDs are constructed directly from FIPS codes
 * already in this project's existing crosswalks instead.
 *
 * One layer: real BLS Local Area Unemployment Statistics (LAUS) rate,
 * city-level where a real series exists (494/512), a real county-level
 * fallback otherwise (18/512) -- 512/512 total real coverage. Already a
 * meaningful, bounded percentage, directly rescaled onto 0-100 (capped
 * at 12% -- Flint, MI's real observed max, 12.3%, sits just above it).
 */
interface UnemploymentRecord {
  unemployment_rate_pct: number;
  as_of: string;
  tier: "city" | "county";
  concern: number;
}

const DATA = unemploymentData as unknown as Record<string, UnemploymentRecord> & { _meta: unknown };

function getUnemploymentValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "unemployment_rate") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const tierNote = record.tier === "city" ? "city rate" : "county rate -- no city-specific LAUS series for this city";
  return {
    value: record.concern,
    detail: `${record.unemployment_rate_pct}% unemployment rate as of ${record.as_of} (${tierNote}) -- BLS LAUS`,
  };
}

export const unemploymentDataset: Dataset = {
  id: "unemployment",
  label: "Unemployment",
  description: "Local unemployment rate -- real BLS Local Area Unemployment Statistics, city-level where available, county fallback otherwise.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/unemployment-methodology.md",
  supportsTime: false,
  layers: [{ id: "unemployment_rate", label: "Unemployment rate" }],
  getValue: getUnemploymentValue,
};
