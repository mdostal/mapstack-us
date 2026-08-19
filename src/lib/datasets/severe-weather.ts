import severeWeatherData from "@data/severe-weather.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The thirty-sixth real Dataset -- severe weather event frequency,
 * ddr8-1 (data-drive-round-8 epic), extended to real multi-year history
 * 1950-2026 (ddr-severe-weather-extend, this session). Real NOAA Storm
 * Events Database, a real static bulk CSV per year -- no API, no key. A
 * genuinely new hazard signal distinct from hazard.ts's FEMA
 * flood/wildfire layers and earthquake.ts's USGS seismic risk. See
 * scripts/gen_severe_weather_data.py.
 *
 * Real multi-year history -- **1950-2026** (`supportsTime: true`), per
 * explicit operator direction to get "as much data as possible" for
 * real trends over time. NOAA's own directory listing confirmed a
 * contiguous real range with no gaps.
 *
 * A real, disclosed caveat: NOAA's own tracked event-type taxonomy
 * expanded over time -- the database began in 1950 tracking ONLY
 * tornadoes, added thunderstorm wind/hail in 1955, and didn't reach its
 * full modern ~50-category taxonomy until 1996. Real early-decade
 * counts are consequently much lower -- a real reflection of NOAA's own
 * historical reporting scope, not a data gap on this project's end.
 *
 * Confirmed live: STATE_FIPS + CZ_FIPS (when CZ_TYPE='C', a real
 * county-based NWS zone) join directly to the existing
 * city-county-fips.json crosswalk -- no new geocoding.
 *
 * One layer: real count of severe weather events (tornado, thunderstorm
 * wind, hail, flood, and others) in the city's county at a given real
 * year, direct rescale capped at a FIXED count (70, the real p90 for
 * the 2024 vintage) applied identically across every year so a city's
 * count stays honestly comparable year to year, higher count = more
 * concerning.
 */
interface SevereWeatherYear {
  event_count: number;
  score: number;
  months_covered: number;
}

interface SevereWeatherRecord {
  county: string;
  years: Record<string, SevereWeatherYear>;
}

interface SevereWeatherMeta {
  years: number[];
}

const DATA = severeWeatherData as unknown as Record<string, SevereWeatherRecord> & { _meta: SevereWeatherMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getSevereWeatherValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "severe_weather_frequency") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  const eventWord = yearData.event_count === 1 ? "event" : "events";
  // Real completeness disclosure, matching drought.ts's own `weeks` field --
  // found necessary by this project's own QA sweep: the in-progress year's
  // real NOAA file can genuinely only cover a few months so far, and an
  // undisclosed 0-event year read as a confident "risk-free" score rather
  // than "not yet reported." Every real completed year has months_covered
  // === 12, so this note only ever appears on the current in-progress year.
  const partialNote = yearData.months_covered < 12 ? ` -- real data through month ${yearData.months_covered} of ${year} only, not a complete year` : "";
  return {
    value: yearData.score,
    detail: `${yearData.event_count} severe weather ${eventWord} in ${record.county} County (${year}) -- NOAA Storm Events Database${partialNote}`,
  };
}

export const severeWeatherDataset: Dataset = {
  id: "severe-weather",
  label: "Severe weather frequency",
  description: "Real NOAA Storm Events frequency, 1950-2026 -- county-level, higher count = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/severe-weather-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "severe_weather_frequency", label: "Severe weather frequency" }],
  getValue: getSevereWeatherValue,
};
