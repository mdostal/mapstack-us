import droughtData from "@data/drought.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-second real Dataset -- county-level drought severity, ddr3-1
 * (data-drive-round-3 epic). Source: the real US Drought Monitor (USDM)
 * data service, a joint NOAA/USDA/University of Nebraska-Lincoln product.
 * No API key required. See scripts/gen_drought_data.py.
 *
 * Reuses the existing city->county crosswalk unchanged -- no new
 * geocoding. Takes a real county FIPS directly; state-level and national
 * queries were tried live and return empty, so this is genuinely
 * county-only (one request per county), same ceiling as business-
 * density.ts/average-wage.ts.
 *
 * One layer: real D2 (Severe Drought or worse) percentage of county area,
 * from USDM's own nested D0-D4 classification -- already a natively
 * 0-100-bounded percentage, direct mapping, no rescale needed. Higher =
 * more concerning. 512/512 real coverage.
 */
interface DroughtRecord {
  severe_drought_pct: number;
  as_of: string;
  county: string;
}

const DATA = droughtData as unknown as Record<string, DroughtRecord> & { _meta: unknown };

function formatDate(yyyymmdd: string): string {
  const year = yyyymmdd.slice(0, 4);
  const month = yyyymmdd.slice(4, 6);
  const day = yyyymmdd.slice(6, 8);
  return `${year}-${month}-${day}`;
}

function getDroughtValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "drought_severity") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.severe_drought_pct,
    detail: `${record.severe_drought_pct.toFixed(1)}% of ${record.county} County in Severe Drought or worse as of ${formatDate(record.as_of)} -- US Drought Monitor`,
  };
}

export const droughtDataset: Dataset = {
  id: "drought",
  label: "Drought severity",
  description: "Real US Drought Monitor severity -- county-level percent of area in Severe Drought or worse.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/drought-methodology.md",
  supportsTime: false,
  layers: [{ id: "drought_severity", label: "Drought severity" }],
  getValue: getDroughtValue,
};
