# Allergy-Severity Scoring — Methodology

Plain-language spec for how `allergy-scores.json` is produced. The scoring model
itself (component formulas, the shipped weight variant, the ground-truth anchors)
is ported verbatim from allergy-locator's `scripts/gen_spine.py`, where it was
originally fitted; this repo re-runs it via `scripts/gen_allergy_scores.py`
against its own `data/cities.json`, so scores cover the full spine, not just the
168 cities allergy-locator's own spine has. Scores are keyed by the same `id` as
`cities.json` (the spine carries no scores and is not modified by scoring).
`SEED_VALLEY` membership (the irrigated grass-seed-valley bonus) is NOT extended
to any city added beyond the original 168 -- that judgment call requires the
same real-world verification the original 17 members got, not a guess; see the
script's own header comment.

## What the score means
A 0–100 **grass-dominant severity** estimate: how rough a place is likely to be
for a person whose reactive allergen is **grass pollen**, with **ragweed, cedar/
juniper, oak, elm, and mold suppressed** (validated negative on a real skin
panel). Higher = worse. It is deliberately *not* a generic pollen index — those
are dominated by species this profile doesn't react to.

**This is a MODELED ESTIMATE, not a measured pollen count** — stated plainly here
because it matters, not buried in the limitations list below. No free, bulk,
city-scale *measured* pollen data source exists for the US today: the one real
measurement network (AAAAI's National Allergy Bureau, real trained counters
reading real samplers) only has ~71 active stations nationally, covering roughly
9% of this project's 512-city spine, and its data isn't an API or bulk download —
it's released per-station through a slow, non-commercial research request process,
not something a live app can wire up. Every free, bulk, programmatic "pollen"
source that exists (Google Pollen API, Ambee, pollen.com/IQVIA) is *also* a model,
just a less transparent one about it. Full research trail, sources checked, and
why each one was ruled out: `real-pollen-data-research.md` in this same directory.
This isn't a gap unique to this project — it's a real gap in what data exists at
all, disclosed here rather than smoothed over.

## The formula
```
raw   = base_season_climate
      + turf_boost            (per-city cultivated turf + grass-seed-valley floor)
      + arid_weed             (arid-SW desert chenopod/amaranth + dust load)
      + elevation_discount    (dry-high shortens the grass season; negative)
      + coastal_nudge         (ocean-breeze moderation; negative)
score = clamp(2, 97, round( compress(raw) ))
```
`compress(x)` leaves everything ≤ 92 untouched and gently tames values above 92
(`92 + (x-92)*0.4`) so the "worst" tier spreads across ~89–97 instead of
pancaking at the cap. For every city scoring ≤ 92 the five components sum
exactly to the score, so each score is fully decomposable — the components are
stored per-city in `allergy-scores.json`.

### 1. `base_season_climate` — grass-pollen season length × climate load
Keyed off Köppen zone (and, for humid-subtropical, latitude). The driver is
**season length**, not species presence (grass grows almost everywhere — see
allergy-locator's [`docs/MODEL-NOTES.md`](https://github.com/mdostal/allergy-locator/blob/main/docs/MODEL-NOTES.md), "presence ≠ severity").

| Zone | base | rationale |
|------|-----:|-----------|
| Af/Am/Aw (tropical/subtropical) | 91 | year-round grass, no winter reset |
| Cfa (humid subtropical) | `85 − (lat−28)·2.2` | long warm-humid season, scales inverse to latitude |
| BWk (cold desert) | 57 | irrigated desert lawns run long |
| BWh (hot desert) | 51 | irrigated Bermuda/rye, hot and long |
| Cfb / Csb / BSh | 46 / 44 / 44 | marine & Mediterranean & hot semi-arid |
| Csa (hot-summer Med, CA valleys) | 40 | |
| Dsb (dry highland) | 24 | short, dry |
| Dfb (warm continental) | 25 | short season, hard reset |
| Dfa (hot continental) | 18 | hot grassy summer but hard cold reset |
| **BSk (cold semi-arid steppe)** | **7** | intentionally LOW — the turf/seed layer does the lifting |
| Dfc (subarctic) | 12 | |

BSk is set low on purpose: the Intermountain/Front-Range steppe is only severe
**where it is irrigated/farmed** (Boise, SLC, Colorado Springs) — that severity
is carried by `turf_boost`, not by the climate base. Dry, un-irrigated BSk
(Rapid City, high plains) correctly stays near-zero.

### 2. `turf_boost` — the recalibrated heavy lever ⭐
Two parts:
- **Per-city turf gradient:** `min(turf_flag, 24) × 1.82`. The turf flag encodes
  cultivated/irrigated/maintained grass intensity (lawns, parks, grass-seed
  farms). Boise's grass-seed farms (flag 22) ≫ ordinary urban lawns (flag 4–6).
- **Grass-seed-valley floor:** a flat **+41** for members of `SEED_VALLEY`
  (Treasure Valley, Willamette, Wasatch/Intermountain, irrigated Front Range,
  Snake River, California Central Valley). Grass-seed agriculture + year-round
  irrigation keep grass pollen high regardless of the dry climate zone.

This is the fix for the old model's central error: it under-weighted irrigated
turf, so dry-but-irrigated cities scored too green. The floor + gradient is why
Boise, Colorado Springs, and Salt Lake City now rise correctly.

### 3. `arid_weed` — arid-Southwest desert weed + dust
`+19` for cities flagged `aridsw` (desert chenopod/amaranth complex — saltbush,
pigweed, Russian thistle/kochia — plus dust and bone-dry-air irritation),
**excluding** seed-valley members (an irrigated valley is not the wind-blown
dust-desert scenario, so the two layers are mutually exclusive). This is what
makes Yuma / Phoenix / Mesa / Carlsbad land high without depending on grass
alone. Note: this is *desert weed*, **not ragweed** — ragweed is off-panel and
never scored.

### 4. `elevation_discount` — dry-high season shortening (negative)
Steps from 0 (below 1,800 ft) to −20 (above 6,500 ft). **Irrigation defeats it:**
for seed-valley members or dense-turf cities (`turf_flag ≥ 8`) the discount is
suppressed by 90% — a watered lawn keeps growing whatever the elevation. This is
why high-but-irrigated Colorado Springs (6,035 ft) stays moderate-high while
high-and-dry Flagstaff (6,909 ft) drops to near-zero.

### 5. `coastal_nudge` — ocean moderation (negative)
`−4` for coastal cities. Sea breeze and marine air moderate exposure ("beach
moderates," e.g. Honolulu). Small and directional, not a hard-fit term.

## A/B test and the shipped variant
Two weighting variants were scored against the ground-truth anchors:

| variant | turf_mult | seed_bonus | arid_w | irrig_supp | **MAE** |
|---------|----------:|-----------:|-------:|-----------:|--------:|
| A — moderate turf boost | 1.05 | 14 | 12 | 0.5 | **10.50** |
| **B — heavy turf + grass-seed-valley boost (SHIPPED)** | 1.82 | 41 | 19 | 0.9 | **2.30** |

B fits more than 4× better and is shipped to `allergy-scores.json`. Under A,
Boise scored 42 and Colorado Springs 19 — the exact under-weighting failure this
recalibration set out to fix. The generator recomputes both MAEs on every run
and asserts the lower-error variant is the one it ships.

## Ground-truth fit
Anchored to a real grass-dominant person's validated 0–100 reactions:

| place | target | model (B) |
|-------|-------:|----------:|
| Flagstaff / Black Hills (Sundance, Rapid City) | 8 | 4 / 13 / 13 |
| Durango | 13 | 12 |
| Omaha | 25 | 25 |
| Kalispell | 30 | 30 |
| Milpitas / Bay (San Jose, Fremont) | 50 | 51 / 51 |
| Salt Lake City | 58 | 60 |
| Fairfax/DC · Colorado Springs | 60 | 61 / 58 |
| Austin · Carlsbad · Whitehouse/E-TX | 78–80 | 91 / 80 / 82 |
| Yuma · Phoenix/Mesa | 82–83 | 81 / 83 / 83 |
| Boise | 88 | 88 |
| Orlando · Ft-Myers/Cape Coral | 92 | 91 / 93 |

Overall mean-absolute-error = **2.3 points**. Tiers: near-zero < 15, low 15–34,
moderate 35–64, high 65–88, worst > 88.

## Data sources
- **Köppen zone, elevation, latitude, coastal flag** — per-city, in the spine.
- **Grass-season / climate load** — Anderegg 2021 (PNAS), Zhang & Steiner 2022
  (Nat. Comms.); see allergy-locator's [`docs/MODEL-NOTES.md`](https://github.com/mdostal/allergy-locator/blob/main/docs/MODEL-NOTES.md).
- **Grass-seed-valley severity** — AAFA city rankings (Boise #1, Provo, Ogden,
  Spokane, SLC, Colorado Springs cluster at the top = irrigated grass-seed
  valleys, not the humid South alone).
- **Arid-SW weed/dust layer** — road-trip validation notes referenced in
  allergy-locator's [`docs/MODEL-NOTES.md`](https://github.com/mdostal/allergy-locator/blob/main/docs/MODEL-NOTES.md).
- **Ground-truth anchors** — the traveler's own logged reactions.

## Honest limitations
- **Directional, not precise.** ±10-point residuals exist (Austin sits ~13 high
  because the anchors aren't monotonic in latitude). Use it to rank regions, not
  to split hairs between two similar cities.
- **Grass-dominant lens only.** These scores are wrong for anyone who reacts to
  ragweed, juniper, oak, or mold — those are deliberately suppressed here.
- **Metro-level, single point.** One lat/lon and Köppen zone per metro; local
  microclimate, irrigation, and your own yard vary.
- **The turf flag is a hand-set estimate** of cultivated-grass intensity, not a
  measured land-cover figure. The grass-seed-valley membership list is curated.
- **Coastal and elevation terms are coarse** step functions, not continuous.
- Fitted to ~20 anchors, so it can overfit their neighborhoods; treat cities far
  from any anchor as lower-confidence.
- **New (post-168) cities never get the seed-valley floor bonus**, even where one
  plausibly applies -- membership is a curated, verified list, not inferred from
  climate/turf data alone.

## Reproducing this dataset

```
python3 scripts/gen_allergy_scores.py
```

Regenerates `data/allergy-scores.json` from `data/cities.json`. Re-run any time
the spine grows. Asserts the MAE-against-ground-truth-anchors check still picks
the same shipped variant (B) -- a failure there means a real transcription bug
in the ported formula, not an intentional recalibration.
