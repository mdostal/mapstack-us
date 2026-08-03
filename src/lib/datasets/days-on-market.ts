import daysOnMarketData from "@data/days-on-market.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The tenth real Dataset -- Zillow Research's free, keyless "Mean Days to
 * Pending" city-level data, a near-free follow-on to housing-inventory.ts
 * (same portal, same direct city/state name join, same
 * normalizeName/NAME_OVERRIDES quirks). See
 * scripts/gen_days_on_market_data.py.
 *
 * One layer: how many days a typical active listing sits before going
 * under contract. A REAL, DELIBERATE FRAMING CHOICE, not an objective
 * fact the data hands you: a LOW days-to-pending (homes selling fast)
 * reads as "hard to compete for a home here" and maps to a HIGH concern
 * percentile here, pairing conceptually with housing-inventory as a
 * shared "market tightness" pair. A fast market is ALSO a legitimate
 * positive signal (a place everyone wants to live) -- named explicitly,
 * not smoothed over. See data/days-on-market-methodology.md.
 */
interface DaysOnMarketRecord {
  days_to_pending: number;
  month: string;
  concern: number;
}

const DATA = daysOnMarketData as unknown as Record<string, DaysOnMarketRecord> & { _meta: unknown };

function getDaysOnMarketValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "market_speed") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.days_to_pending} mean days to pending (${record.month}) -- Zillow Research`,
  };
}

export const daysOnMarketDataset: Dataset = {
  id: "days-on-market",
  label: "Housing market speed",
  description: "Zillow Mean Days to Pending -- how fast homes go under contract, higher = faster (harder to compete for a home).",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/days-on-market-methodology.md",
  supportsTime: false,
  layers: [{ id: "market_speed", label: "Market speed" }],
  getValue: getDaysOnMarketValue,
};
