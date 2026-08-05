import airQualityData from "@data/air-quality.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The twenty-fifth real Dataset -- current-conditions Air Quality Index
 * (`.pHive/epics/data-store/docs/dataset-backlog.md` #6), unblocked by a
 * real, free, self-serve EPA_AIRNOW_API_KEY (https://docs.airnowapi.org).
 * See scripts/gen_air_quality_data.py.
 *
 * One layer: real AQI (the worse of PM2.5/ozone), already a meaningful
 * 0-500+ concern-oriented scale, directly rescaled (capped at 150 -- the
 * real observed spine 90th-percentile-plus range). 459/512 real coverage
 * -- the remaining 53 hit AirNow's rate limit mid-build (a real,
 * documented, recoverable gap, not a genuine no-monitor area -- see
 * data/air-quality-methodology.md), never defaulted to "Good."
 */
interface AirQualityRecord {
  aqi: number;
  parameter: string;
  category: string;
  reporting_area: string;
  date_observed: string;
  concern: number;
}

const DATA = airQualityData as unknown as Record<string, AirQualityRecord> & { _meta: unknown };

function getAirQualityValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "air_quality_index") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `AQI ${record.aqi} (${record.category}, driven by ${record.parameter}) on ${record.date_observed} -- ${record.reporting_area}, EPA AirNow`,
  };
}

export const airQualityDataset: Dataset = {
  id: "air-quality",
  label: "Air quality",
  description: "Current-conditions Air Quality Index (PM2.5/ozone, whichever is worse) -- real EPA AirNow observations.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/air-quality-methodology.md",
  supportsTime: false,
  layers: [{ id: "air_quality_index", label: "Air Quality Index" }],
  getValue: getAirQualityValue,
};
