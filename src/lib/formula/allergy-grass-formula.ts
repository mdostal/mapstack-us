import grassScores from "@data/allergy-scores.json";

/**
 * Live, re-runnable reimplementation of data/allergy-scoring.md's grass
 * formula, for the power-user Formula panel's per-component weight
 * sliders. Only the "grass" layer has this decomposition -- the other 27
 * comprehensive allergens (data/allergens.json) are a coarser
 * climate-zone-only model with no stored component breakdown, so they
 * have nothing to tune (see FormulaPanel.tsx, which shows a transparency
 * note instead for those layers).
 *
 * The five components already sum to the shipped score for every city
 * (data/allergy-scoring.md: "For every city scoring <=92 the five
 * components sum exactly to the score") -- verified against all 168
 * shipped scores in tests/allergy-grass-formula.test.ts, not just spot
 * checked, before any UI was built on top of this.
 */

export const FORMULA_COMPONENT_KEYS = [
  "base_season_climate",
  "turf_boost",
  "arid_weed",
  "elevation_discount",
  "coastal_nudge",
] as const;

export type FormulaComponentKey = (typeof FORMULA_COMPONENT_KEYS)[number];

export const FORMULA_COMPONENT_LABELS: Record<FormulaComponentKey, string> = {
  base_season_climate: "Season length × climate (Köppen zone)",
  turf_boost: "Cultivated/irrigated turf",
  arid_weed: "Arid-Southwest desert weed + dust",
  elevation_discount: "Elevation (dry-high season shortening)",
  coastal_nudge: "Coastal ocean moderation",
};

export type GrassFormulaComponents = Record<FormulaComponentKey, number>;
export type ComponentWeights = Record<FormulaComponentKey, number>;

export const DEFAULT_WEIGHTS: ComponentWeights = {
  base_season_climate: 1,
  turf_boost: 1,
  arid_weed: 1,
  elevation_discount: 1,
  coastal_nudge: 1,
};

const scoreIndex = new Map(grassScores.map((entry) => [entry.id, entry]));

export function getGrassComponents(cityId: string): GrassFormulaComponents | null {
  const entry = scoreIndex.get(cityId);
  if (!entry) return null;
  return {
    base_season_climate: entry.base_season_climate,
    turf_boost: entry.turf_boost,
    arid_weed: entry.arid_weed,
    elevation_discount: entry.elevation_discount,
    coastal_nudge: entry.coastal_nudge,
  };
}

/** data/allergy-scoring.md's compress(x): untouched at/below 92, gently
 * tamed above 92 so the "worst" tier spreads across ~89-97 instead of
 * pancaking at the cap. */
export function compress(raw: number): number {
  return raw <= 92 ? raw : 92 + (raw - 92) * 0.4;
}

export function recomputeGrassScore(components: GrassFormulaComponents, weights: ComponentWeights): number {
  const raw = FORMULA_COMPONENT_KEYS.reduce((sum, key) => sum + components[key] * weights[key], 0);
  return Math.min(97, Math.max(2, Math.round(compress(raw))));
}
