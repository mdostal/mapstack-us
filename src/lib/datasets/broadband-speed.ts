import broadbandSpeedData from "@data/broadband-speed.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-seventh real Dataset -- gigabit broadband availability,
 * ddr9-1 (data-drive-round-9 epic). Real FCC National Broadband Map
 * data, genuinely distinct from broadband.ts's Census ACS subscription-
 * RATE dataset (do households actually pay for service) -- this
 * measures AVAILABILITY (can a location get gigabit service at all).
 * See scripts/gen_broadband_speed_data.py.
 *
 * A real, deliberate metric choice: the FCC's own official 100/20 Mbps
 * "broadband" standard is already >99.6% available across every city in
 * this spine (checked live during research -- essentially solved for
 * populous incorporated cities, zero real differentiation). Gigabit
 * (1000/100 Mbps) availability is a real, still-unequal infrastructure
 * tier even among large cities (real observed range 1.8%-99.6%).
 *
 * One layer: real % of locations with gigabit access, percentile-ranked
 * and INVERTED among covered cities -- LOWER availability is MORE
 * concerning, a digital-divide framing. 505/512 real coverage (the
 * same real Connecticut county/planning-region gap several other
 * county-joined datasets this session already disclose).
 */
interface BroadbandSpeedRecord {
  pct_gigabit_available: number;
  county: string;
  concern: number;
}

const DATA = broadbandSpeedData as unknown as Record<string, BroadbandSpeedRecord> & { _meta: unknown };

function getBroadbandSpeedValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "gigabit_availability") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.pct_gigabit_available}% of ${record.county} County has gigabit (1000/100 Mbps) broadband access -- FCC National Broadband Map`,
  };
}

export const broadbandSpeedDataset: Dataset = {
  id: "broadband-speed",
  label: "Gigabit availability",
  description: "Real FCC gigabit broadband availability -- county-level, lower availability = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/broadband-speed-methodology.md",
  supportsTime: false,
  layers: [{ id: "gigabit_availability", label: "Gigabit availability", legendLow: "High availability", legendHigh: "Low availability" }],
  getValue: getBroadbandSpeedValue,
};
