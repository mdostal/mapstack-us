import grassScores from "@data/allergy-scores.json";
import allergensData from "@data/allergens.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The first real Dataset implementation, ported from allergy-locator's
 * validated grass ground-truth (data/allergy-scores.json, MAE 2.3 against
 * real lived reactions) plus its comprehensive modeled-allergen expansion
 * (data/allergens.json).
 *
 * Deliberately a REDUCED port, not a full clone of allergy-locator: this
 * dataset is annual-only (`supportsTime: false`). allergy-locator's real
 * per-city daily-resolution season curves, county-grid densification, and
 * BYO-key panel-upload personalization are NOT ported here -- porting the
 * full feature set would defeat the point of this repo, which is proving
 * the GENERALIZED wrapper interface works across genuinely different
 * datasets, not re-shipping allergy-locator's complete flagship product.
 * allergy-locator remains the full-fidelity allergy tool; this is a
 * necessarily thinner reference implementation of the same underlying data
 * through the new shared interface.
 */
const grassScoreIndex = new Map(grassScores.map((entry) => [entry.id, entry]));
const comprehensiveIndex = new Map(
  allergensData.scores.map((s) => [`${s.allergen_id}::${s.city_id}`, s]),
);

function tierLabel(tier: string): string {
  return tier.replace(/-/g, " ");
}

function getAllergyValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId === "grass") {
    const entry = grassScoreIndex.get(cityId);
    if (!entry) return null;
    return { value: entry.score, tier: entry.tier, detail: `${entry.score}/100, ${tierLabel(entry.tier)}` };
  }

  const entry = comprehensiveIndex.get(`${layerId}::${cityId}`);
  if (!entry) return null;
  return { value: entry.score, tier: entry.tier, detail: `${entry.score}/100, ${tierLabel(entry.tier)}` };
}

export const allergyDataset: Dataset = {
  id: "allergy",
  label: "Allergy severity",
  description: "Pollen/mold severity by allergen, ported from allergy-locator's validated city scores.",
  methodologyUrl: "https://github.com/mdostal/allergy-locator/blob/main/data/allergy-scoring.md",
  supportsTime: false,
  layers: [
    { id: "grass", label: "Grass" },
    ...allergensData.allergens.map((a) => ({ id: a.id, label: a.label })),
  ],
  getValue: getAllergyValue,
};
