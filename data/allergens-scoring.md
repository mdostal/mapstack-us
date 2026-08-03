# Comprehensive Allergen Scoring — Methodology (modeled, not validated)

Plain-language spec for `data/allergens.json`. The model is ported verbatim
from allergy-locator's `scripts/source_allergens.py`; this repo regenerates it
via `scripts/gen_allergens.py` against its own `data/cities.json`, so it covers
the full spine, not just allergy-locator's original 168. Covers every allergen
beyond the original 15-species author panel (`data/species-ranges.json`,
copied unchanged) and grass's ground-truth-fit formula
(`data/allergy-scoring.md`) — per the explicit instruction to pull and include
every allergen there's sourceable data for, not a curated subset.

## What this is — and isn't
Every entry here is `confidence: "modeled"`. None of them has an equivalent to
grass's real, ground-truth-fit formula (MAE 2.3 against a real person's logged
reactions). These scores are a good-faith, climate-grounded extension of the
same "presence ≠ severity, score by season/climate" principle — never
presented with grass's rigor, and never silently upgraded to `"validated"`.

## Method
Each allergen gets a per-Köppen-zone baseline severity score (0-100), applied
to every city in `data/cities.json` via that city's `koppen` field (already
present, already used for grass). A small coastal adjustment applies to
allergens where coastal moisture is ecologically relevant (currently only
Cladosporium). This is deliberately coarser than grass's 5-component formula
— no turf/irrigation, no elevation discount, no per-city hand-tuning — because
none of these allergens has ground truth to justify that level of precision
yet.

Tiers use the same thresholds as grass: near-zero < 15, low 15-34, moderate
35-64, high 65-88, worst ≥ 89.

## Sources
Species/genus selection and their real ecological range patterns (not exact
per-city counts) are drawn from:
- **USDA PLANTS database** (public domain) — same source as the original
  15-species presence data. Confirms distribution for tall fescue, orchard
  grass, sweet vernal grass, redtop, sagebrush, kochia/Russian thistle,
  mugwort, dock/sorrel, nettle, and the added tree species.
- **AAAAI / AAFA patient-facing allergen pages** — used only to identify which
  species/genera are clinically relevant enough to include, not for any count
  data.
- **Academic aerobiology literature** — mold genera selection (Alternaria,
  Cladosporium as the two most clinically significant outdoor molds) and the
  Cladosporium/Alternaria weather-correlation pattern below.

**No NAB (National Allergy Bureau) data was used anywhere in this file.**
`REQUIREMENTS.md` documents NAB as reference/QA-only, reuse-restricted — this
dataset doesn't touch it. Checked and rejected as sources: NAB itself
(restricted), MoldRANGE/Eurofins (commercial, not open-licensable). Two
genuinely open academic mold datasets exist (Zenodo's Global Spore Sampling
Project, a national-parks fungal-DNA study) but cover too few US sites (~7-47
globally) to serve as this dataset's primary source — they're useful only as
future spot-check validation anchors, not embedded here.

## Mold: why two genera, two different models
A 1997 Denver aerobiology study (8 years, independent Rotorod sampling,
PubMed 9334570) found **Cladosporium correlates positively with temperature
and relative humidity, negatively with precipitation** — a real, citable basis
for a climate-zone-driven proxy. The same study found **Alternaria and
Epicoccum did NOT show a strong weather correlation** — their variation was
mainly seasonal-cycle-driven, not climate-zone-driven. Honoring that finding:
Cladosporium's table has real climate-zone spread (near-zero in hot deserts,
high in humid subtropical/tropical); Alternaria's table is deliberately
flatter (roughly 22-40 across all zones) rather than forcing a humidity
correlation the literature didn't support for it. Seasonal variation for both
(the actual primary driver for Alternaria) is out of scope for this story —
that's story s6 (season-position scoring).

## Honest limitations
- **Climate-zone granularity, not per-city precision.** Two cities sharing a
  Köppen code get the same baseline score for a given allergen, before the
  small coastal adjustment. This is coarser than grass's model on purpose —
  matching the confidence level these allergens actually have.
- **No ground-truth validation exists** for any allergen in this file. Unlike
  grass, there's no logged real-person reaction data to fit against. Treat
  every score here as directional, more so than grass's.
- **Tree species list is not exhaustive.** Eight additional tree species were
  added (red oak, white ash, red maple, loblolly pine, black walnut, American
  sycamore, red alder, shagbark hickory) as a representative, real expansion —
  not a claim of covering every allergenic tree species in the US. The
  data-driven architecture (adding an entry to `ALLERGEN_DEFS` and re-running
  the generator) makes extending this list a data change, not a code change.
- **Presence is baseline-based, not a hard gate.** Every allergen scores
  something in every city (even if near-zero) rather than being hard-excluded
  — a near-zero score and "not present" read the same to a user in practice,
  and this avoids a brittle exact-cutoff presence rule on top of an already-
  approximate model.

## Reproducing this dataset

```
python3 scripts/gen_allergens.py
```

Regenerates `data/allergens.json` from `data/cities.json` + `data/species-ranges.json`.
Re-run any time the spine grows.
