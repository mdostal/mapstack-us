import daysOnMarketData from "@data/days-on-market.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";

/**
 * The ninth real Dataset -- Zillow Research's free, keyless "Mean Days to
 * Pending" city-level data, a near-free follow-on to housing-inventory.ts
 * (same portal, same direct city/state name join, same
 * normalizeName/NAME_OVERRIDES quirks). Extended to real multi-year
 * history 2018-2026 (ddr-zillow-extend, this session), same technique as
 * housing-inventory.ts's own extension -- the same file already fetched
 * is a full monthly time series, just parsed for every month instead of
 * only the latest. See scripts/gen_days_on_market_data.py.
 *
 * One layer: how many days a typical active listing sits before going
 * under contract. A REAL, DELIBERATE FRAMING CHOICE, not an objective
 * fact the data hands you: a LOW days-to-pending (homes selling fast)
 * reads as "hard to compete for a home here" and maps to a HIGH concern
 * percentile here, pairing conceptually with housing-inventory as a
 * shared "market tightness" pair. A fast market is ALSO a legitimate
 * positive signal (a place everyone wants to live) -- named explicitly,
 * not smoothed over. Percentile-ranked independently PER YEAR (same
 * convention as crime.ts/income.ts for unbounded raw quantities). See
 * data/days-on-market-methodology.md.
 */
interface DaysOnMarketYear {
  days_to_pending: number;
  month: string;
  concern: number;
}

interface DaysOnMarketRecord {
  years: Record<string, DaysOnMarketYear>;
}

interface DaysOnMarketMeta {
  years: number[];
}

const DATA = daysOnMarketData as unknown as Record<string, DaysOnMarketRecord> & { _meta: DaysOnMarketMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getDaysOnMarketValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "market_speed") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.days_to_pending} mean days to pending (${yearData.month}) -- Zillow Research`,
  };
}

export const daysOnMarketDataset: Dataset = {
  id: "days-on-market",
  label: "Housing market speed",
  description: "Zillow Mean Days to Pending, 2018-2026 -- how fast homes go under contract, higher = faster (harder to compete for a home).",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/days-on-market-methodology.md",
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [{ id: "market_speed", label: "Market speed" }],
  getValue: getDaysOnMarketValue,
};
