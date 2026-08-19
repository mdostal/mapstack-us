import droughtData from "@data/drought.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The thirty-first real Dataset -- county-level drought severity,
 * extended to real multi-year history 2000-2026 (this session's
 * unplanned "keep going" continuation, after severe-weather and
 * air-quality). Real US Drought Monitor (USDM) data service, no API
 * key. See scripts/gen_drought_data.py.
 *
 * USDM's own real weekly records begin 2000-01-04 -- the real start of
 * the Drought Monitor program itself. Unlike other multi-year builds
 * this session, this needed no per-year fetch loop: USDM's API takes a
 * real date range and returns every real weekly row in one response, so
 * each of the spine's ~293 unique counties was fetched ONCE across the
 * full real range.
 *
 * One layer: the annual AVERAGE of USDM's own weekly `D2` (Severe
 * Drought or worse) percentage across every real week published that
 * calendar year -- a real annual severity measure, smoother than one
 * arbitrary week. Already natively 0-100-bounded, no rescale, higher =
 * more concerning, comparable year to year with no cap needed.
 *
 * A real, confirmed-live surprise: USDM's own FIPS-coded boundary layer
 * already reflects Connecticut's 2022 planning-region transition,
 * consistently across the ENTIRE real 2000-2026 history -- USDM
 * retroactively recomputed historical CT percentages against its
 * current boundary set, so CT cities join cleanly with no fallback
 * needed here (unlike several other datasets this session).
 */
interface DroughtYear {
  severe_drought_pct: number;
  weeks: number;
}

interface DroughtRecord {
  county: string;
  years: Record<string, DroughtYear>;
}

interface DroughtMeta {
  years: number[];
}

const DATA = droughtData as unknown as Record<string, DroughtRecord> & { _meta: DroughtMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getDroughtValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "drought_severity") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.severe_drought_pct,
    detail: `${yearData.severe_drought_pct.toFixed(1)}% of ${record.county} County in Severe Drought or worse, ${year} average (${yearData.weeks} weeks) -- US Drought Monitor`,
  };
}

export const droughtDataset: Dataset = {
  id: "drought",
  label: "Drought severity",
  description: "Real US Drought Monitor severity, 2000-2026 -- county-level annual average percent in Severe Drought or worse.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/drought-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "drought_severity", label: "Drought severity" }],
  getValue: getDroughtValue,
};
