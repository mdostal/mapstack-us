import politicalLeanData from "@data/political-lean.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The fifteenth real Dataset -- electoral competitiveness, from real
 * county-level 2024 presidential returns (MIT Election Data + Science
 * Lab's official county-election-returns compilation), joined via the
 * SAME city->county crosswalk hazard.ts/traffic-fatalities.ts already
 * built. Built only after an explicit operator sign-off -- this is the
 * one dataset in the project's own research backlog flagged as genuinely
 * sensitive for a public site, so it wasn't built without asking first.
 * See scripts/gen_political_lean_data.py and
 * data/political-lean-methodology.md.
 *
 * A deliberate, discussed-and-approved framing choice: NOT a left/right
 * "lean" score. That would require an editorial judgment about which
 * party's dominance is "more concerning" -- a call this project has no
 * basis to make, and one that risks the map itself reading as taking a
 * side. Instead this measures ELECTORAL COMPETITIVENESS: how lopsided
 * the county's real 2024 margin was, regardless of which party won.
 * Higher margin (a bigger blowout, either direction) = more concerning --
 * on the reasoning that competitive elections are what keep officials
 * accountable, not a specific party's win.
 *
 * One layer, county-level (not city-level) -- the same "one number per
 * county" blur hazard.ts/traffic-fatalities.ts/svi.ts all carry, worth
 * naming with extra emphasis here specifically because a county's
 * aggregate margin can differ sharply from a city's own actual
 * electorate, especially for a city that's a small fraction of a large,
 * more rural county. 505/512 real coverage -- the 7 gaps are all
 * Connecticut cities: CT replaced its 8 legacy counties with 9 planning
 * regions in 2022, and this project's existing county crosswalk already
 * uses the new geography while MEDSL's 2024 file still reports under the
 * old one -- a real, confirmed geography-vintage mismatch between two
 * real sources, not a join bug. See data/political-lean-methodology.md.
 */
interface PoliticalLeanRecord {
  county: string;
  winner: string;
  winner_party: string;
  runner_up: string;
  margin_pct: number;
  concern: number;
}

const DATA = politicalLeanData as unknown as Record<string, PoliticalLeanRecord> & { _meta: unknown };

function getPoliticalLeanValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "competitiveness") return null;
  const record = DATA[cityId];
  if (!record) return null;

  return {
    value: record.concern,
    detail: `${record.winner} (${record.winner_party}) won ${record.county} County by ${record.margin_pct} points over ${record.runner_up}, 2024 -- MIT Election Data + Science Lab (competitiveness, not left/right lean)`,
  };
}

export const politicalLeanDataset: Dataset = {
  id: "political-lean",
  label: "Electoral competitiveness",
  description: "How lopsided the 2024 presidential margin was, county-level -- NOT a left/right lean score, higher = less contested/more one-sided.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/political-lean-methodology.md",
  supportsTime: false,
  layers: [{ id: "competitiveness", label: "Electoral competitiveness" }],
  getValue: getPoliticalLeanValue,
};
