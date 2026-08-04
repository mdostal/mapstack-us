import { activeLayerKey, resolveActiveLayer, type ActiveLayer } from "@/lib/active-layers";
import type { DatasetTimeContext } from "@/lib/datasets/types";

/** Per-layer weight, keyed by activeLayerKey(). A weight of 0 (or an
 * absent entry, defaulting to 1) excludes that layer from the blend --
 * see computeBlendValue's own doc comment. */
export type BlendWeights = Record<string, number>;

export const DEFAULT_BLEND_WEIGHT = 1;
export const MAX_BLEND_WEIGHT = 2;

export function defaultBlendWeights(layers: ActiveLayer[]): BlendWeights {
  return Object.fromEntries(layers.map((l) => [activeLayerKey(l), DEFAULT_BLEND_WEIGHT]));
}

/**
 * A genuinely user-defined weighted average across whichever active
 * layers the operator chose to include, at whatever weight they chose --
 * the weighting is THEIRS, never one this project invents on its own
 * (the same "don't invent a cross-dataset weighting" principle
 * crime.ts/hazard.ts/svi.ts/political-lean.ts all hold to for their OWN
 * internal layers, extended here as an opt-in power-user tool rather than
 * a shipped default).
 *
 * A weight of 0 excludes that layer from this specific blend entirely
 * (it stays selected/active everywhere else in the app -- this is a
 * display-only combination, not a re-selection). A layer with no real
 * data for a given city (a real, honest gap -- see any dataset's own
 * `getValue` returning null) is skipped for that city specifically and
 * the remaining included layers' weights are renormalized, the same
 * "average of what's actually there" logic housing-inventory.ts's own
 * percentile computation already applies at the dataset-build level, not
 * treated as a 0 that would silently drag the blend down.
 *
 * Returns null only when EVERY included layer lacks data for this city
 * (an honest "no blend possible here," never a fabricated value).
 */
export function computeBlendValue(
  cityId: string,
  layers: ActiveLayer[],
  weights: BlendWeights,
  context?: DatasetTimeContext,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const layer of layers) {
    const weight = weights[activeLayerKey(layer)] ?? DEFAULT_BLEND_WEIGHT;
    if (weight <= 0) continue;

    const resolved = resolveActiveLayer(layer);
    if (!resolved) continue;

    const result = resolved.dataset.getValue(cityId, resolved.layer.id, context);
    if (!result) continue;

    weightedSum += weight * result.value;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : null;
}
