import politicalLeanData from "@data/political-lean.json";
import type { Dataset, DatasetLayerValue, DatasetTimeContext } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

/**
 * The fourteenth real Dataset -- electoral competitiveness, from real
 * county-level presidential returns (MIT Election Data + Science Lab's
 * official county-election-returns compilation), joined via the SAME
 * city->county crosswalk hazard.ts/traffic-fatalities.ts already built.
 * Built only after an explicit operator sign-off -- this is the one
 * dataset in the project's own research backlog flagged as genuinely
 * sensitive for a public site, so it wasn't built without asking first.
 * See scripts/gen_political_lean_data.py and
 * data/political-lean-methodology.md.
 *
 * A deliberate, discussed-and-approved framing choice: NOT a left/right
 * "lean" score. That would require an editorial judgment about which
 * party's dominance is "more concerning," a call this project has no
 * basis to make, and one that risks the map itself reading as taking a
 * side. Instead this measures ELECTORAL COMPETITIVENESS: how lopsided
 * the county's real margin was in a given cycle, regardless of which
 * party won. Higher margin (a bigger blowout, either direction) = more
 * concerning -- on the reasoning that competitive elections are what
 * keep officials accountable, not a specific party's win.
 *
 * Real multi-cycle history (2000, 2004, 2008, 2012, 2016, 2020, 2024 --
 * all 7 real presidential cycles MEDSL's full county-returns file
 * covers), per explicit operator direction to get "as much data as
 * possible" for real trends over time. 4-year cadence, not annual --
 * `availableYears` only ever offers the 7 real election years, never an
 * off-cycle year invented to look more granular.
 *
 * One layer, county-level (not city-level) -- the same "one number per
 * county" blur hazard.ts/traffic-fatalities.ts/svi.ts all carry, worth
 * naming with extra emphasis here specifically because a county's
 * aggregate margin can differ sharply from a city's own actual
 * electorate, especially for a city that's a small fraction of a large,
 * more rural county. 505/512 real coverage at every cycle -- the 7 gaps
 * are all Connecticut cities: CT replaced its 8 legacy counties with 9
 * planning regions in 2022, and this project's existing county crosswalk
 * already uses the new geography while MEDSL's file reports every cycle
 * under the old one -- a real, confirmed geography-vintage mismatch
 * between two real sources, not a join bug specific to one year. See
 * data/political-lean-methodology.md.
 */
interface PoliticalLeanYear {
  winner: string;
  winner_party: string;
  runner_up: string;
  margin_pct: number;
  concern: number;
}

interface PoliticalLeanRecord {
  county: string;
  years: Record<string, PoliticalLeanYear>;
}

interface PoliticalLeanMeta {
  years: number[];
}

const DATA = politicalLeanData as unknown as Record<string, PoliticalLeanRecord> & { _meta: PoliticalLeanMeta };
const AVAILABLE_YEARS = DATA._meta.years;
const LATEST_YEAR = Math.max(...AVAILABLE_YEARS);

function getPoliticalLeanValue(cityId: string, layerId: string, context?: DatasetTimeContext): DatasetLayerValue | null {
  if (layerId !== "competitiveness") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const year = context?.year ?? LATEST_YEAR;
  const yearData = record.years[String(year)];
  if (!yearData) return null;

  return {
    value: yearData.concern,
    detail: `${yearData.winner} (${yearData.winner_party}) won ${record.county} County by ${yearData.margin_pct} points over ${yearData.runner_up}, ${year} -- MIT Election Data + Science Lab (competitiveness, not left/right lean)`,
  };
}

export const politicalLeanDataset: Dataset = {
  id: "political-lean",
  label: "Electoral competitiveness",
  description: "How lopsided the presidential margin was, county-level, across every real cycle 2000-2024 -- NOT a left/right lean score, higher = less contested/more one-sided.",
  methodologyUrl: methodologyDocUrl("political-lean"),
  supportsTime: true,
  availableYears: AVAILABLE_YEARS,
  layers: [
    {
      id: "competitiveness",
      label: "Electoral competitiveness",
      legendLow: "More competitive",
      legendHigh: "Less competitive",
    },
  ],
  getValue: getPoliticalLeanValue,
};
