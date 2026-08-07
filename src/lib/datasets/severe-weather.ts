import severeWeatherData from "@data/severe-weather.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-seventh real Dataset -- severe weather event frequency,
 * ddr8-1 (data-drive-round-8 epic). Real NOAA Storm Events Database, a
 * static bulk CSV per year -- no API, no key. A genuinely new hazard
 * signal distinct from hazard.ts's FEMA flood/wildfire layers and
 * earthquake.ts's USGS seismic risk. See
 * scripts/gen_severe_weather_data.py.
 *
 * Confirmed live: STATE_FIPS + CZ_FIPS (when CZ_TYPE='C', a real
 * county-based NWS zone) join directly to the existing
 * city-county-fips.json crosswalk -- no new geocoding.
 *
 * One layer: real count of severe weather events (tornado, thunderstorm
 * wind, hail, flood, and others) in the city's county for 2024, direct
 * rescale capped at the real p90 across the spine (70), higher count =
 * more concerning. 512/512 real coverage.
 */
interface SevereWeatherRecord {
  event_count: number;
  county: string;
  year: number;
  score: number;
}

const DATA = severeWeatherData as unknown as Record<string, SevereWeatherRecord> & { _meta: unknown };

function getSevereWeatherValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "severe_weather_frequency") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const eventWord = record.event_count === 1 ? "event" : "events";
  return {
    value: record.score,
    detail: `${record.event_count} severe weather ${eventWord} in ${record.county} County (${record.year}) -- NOAA Storm Events Database`,
  };
}

export const severeWeatherDataset: Dataset = {
  id: "severe-weather",
  label: "Severe weather frequency",
  description: "Real NOAA Storm Events frequency -- county-level, higher count = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/severe-weather-methodology.md",
  supportsTime: false,
  layers: [{ id: "severe_weather_frequency", label: "Severe weather frequency" }],
  getValue: getSevereWeatherValue,
};
