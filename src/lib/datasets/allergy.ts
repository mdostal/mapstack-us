import grassScores from "@data/allergy-scores.json";
import allergensData from "@data/allergens.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";
import { methodologyDocUrl } from "@/lib/dataset-sources";

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
 *
 * Every value returned here is a MODELED estimate, not a measured pollen
 * count -- said plainly in getValue's own detail string, not just in the
 * doc. Real, free, bulk, city-scale measured pollen data does not exist for
 * the US (researched directly, not assumed -- see
 * data/real-pollen-data-research.md): the one genuine measurement network,
 * AAAAI's National Allergy Bureau, only covers ~9% of the spine and isn't
 * an API or bulk download at all, and every "free pollen API" that does
 * exist (Google, Ambee, pollen.com/IQVIA) is itself a model, just a less
 * transparent one about it.
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
    return { value: entry.score, tier: entry.tier, detail: `${entry.score}/100, ${tierLabel(entry.tier)} -- modeled estimate, not a measured pollen count (see methodology)` };
  }

  const entry = comprehensiveIndex.get(`${layerId}::${cityId}`);
  if (!entry) return null;
  return { value: entry.score, tier: entry.tier, detail: `${entry.score}/100, ${tierLabel(entry.tier)} -- modeled estimate, not a measured pollen count (see methodology)` };
}

export const allergyDataset: Dataset = {
  id: "allergy",
  label: "Allergy severity",
  description: "Pollen/mold severity by allergen -- a MODELED estimate (not a measured pollen count; no free measured US source exists at city scale), ported from allergy-locator's validated city scores.",
  methodologyUrl: methodologyDocUrl("allergy"),
  supportsTime: false,
  layers: [
    { id: "grass", label: "Grass" },
    ...allergensData.allergens.map((a) => ({ id: a.id, label: a.label })),
  ],
  getValue: getAllergyValue,
};
