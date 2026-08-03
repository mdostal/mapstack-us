# Known issues / backlog — live operator feedback, 2026-08-02/03

Captured verbatim from live testing of the map-controls + formula-overlay work.
Not yet triaged into stories; this is the holding pen. Each item below is
either a real bug, a real UX gap, or a real research question — none are
"fix immediately" without more digging first, per operator direction to
compile rather than immediately code.

## Status update, 2026-08-03 — items 1-4 resolved

- **#1**: Researched (`data/real-pollen-data-research.md`). Verdict: no free,
  bulk, city-level measured pollen source exists anywhere (NAB is real but
  not free/bulk/broad; everything free is a forecast model, not measured
  counts). Current modeled approach stays, now disclosed prominently
  in-product (Formula panel) rather than only in the methodology doc.
- **#2**: Fixed. `CityDetailPanel` (already built, already used in the
  simple view) is now wired into `/advanced`'s Map view too — selecting a
  city shows its name + every visible layer's value directly under the map.
- **#3**: Root-caused as (b), not (a) — `DEFAULT_LAYER_CONTROL.inverted` is
  genuinely `false`, confirmed by existing test coverage. Fixed the real
  underlying issue regardless: an inverted layer now gets a persistent
  amber badge + tinted chip border, not just a subtle button-pressed state.
- **#4**: Fixed in both `/advanced` (`PowerUserPanel.tsx`'s sidebar) and the
  simple view (`MapstackApp.tsx`'s sidebar + legend list) — both are now
  `sticky` + height-capped + independently scrollable, so an expanded
  Layers/Care-access section no longer grows the whole page/map.

## 1. Grass "formula" isn't raw measured pollen data — real gap, needs research

Operator's ask: "tear out the grass to the REAL DATA not just our numbers."

Checked `data/allergy-scoring.md` + `allergy-locator/scripts/gen_spine.py`
directly. The grass score is a **modeled** estimate built from published
climate-load research (Anderegg 2021 PNAS, Zhang & Steiner 2022) + AAFA's
city allergy rankings, then validated against **one person's own logged real
reactions** (the original allergy-locator author's) — not raw pollen counts
from a public monitoring network. It's real ground-truth-anchored, but
personal ground truth, not the same thing as objective measured pollen
counts.

**Research needed before building anything**: does a real, city-level, free
(or feasibly-licensable) pollen COUNT data source exist? Leading candidate:
NAB (National Allergy Bureau) certified counting stations — need to verify
current public data access (most NAB-affiliated feeds are paywalled via
pollen.com/IQVIA, not a free bulk API), station count/coverage against our
168-city spine, and whether it's grass-species-specific or a general pollen
index. If a real source exists, this becomes a proper new
`Dataset`/methodology-doc pass, same rigor as care-access/crime. If it
doesn't exist at usable free/city-level granularity, the honest answer is
"no better real source exists" and the current modeled approach stays,
documented more prominently as modeled-not-measured.

## 2. City selection has no visible confirmation in Map view

Operator: "how do I know what city I selected? I'm trying to figure that
out." Screenshot shows a marker on the map is visibly different (a dark
dot) but there's no name/label anywhere confirming which city that is or
what its values are. Table view shows this via row highlight; Map view has
nothing equivalent.

**Real gap** — MultiLayerMap's `onSelectCity` sets state but there's no
city detail panel/label rendered in Map view (CityDetailPanel exists in
allergy-locator's pattern but isn't wired into `/advanced`'s Map view at
all currently). Needs a visible "selected city" readout near the map —
name + each visible layer's value, at minimum.

## 3. Invert confusion on Care access: Pediatric cardiac surgery

Operator: "the pediatric surgery seems to need the invert or austin doesn't
have access? so it seems it is inverted by default (which it shouldn't be,
invert is what I want to apply)."

Two possible root causes, not yet distinguished:
- (a) A real default-state bug — `inverted` isn't actually `false` on
  mount for a freshly-added layer.
- (b) The operator toggled Invert while exploring (the chip's opacity was
  already a non-default 62%, so they'd clearly been interacting with that
  exact chip) and lost track of which state it was in, because the ONLY
  visual cue for "this layer is inverted" is the Invert button's own
  pressed styling — easy to miss at a glance, especially scanning several
  chips at once.

**Needs**: (1) verify in code/tests that a new layer's control genuinely
defaults to `inverted: false` (strong prior: it does, per
`DEFAULT_LAYER_CONTROL` in `lib/map-layers.ts` and existing e2e coverage —
but worth a direct repro before assuming user error). (2) Regardless of
root cause, make "this layer is inverted" much more visually obvious —
e.g. a persistent badge/label on the chip itself (not just button
pressed-state), so it's legible without close inspection.

## 4. Layers sidebar (or control strip?) growing pushes/grows the map

Operator: "the added ones need a scrollable area as if they go past the map
size, they cause the map to also increase in size."

Ambiguous which surface this refers to — needs a repro to confirm:
- Most likely: the **left "Layers" sidebar** (`LayerPicker.tsx`, inside the
  Layers `AccordionSection`) has no independent max-height/scroll. With
  Crime (2 layers) + Care access (3 layers) all expanded, the sidebar's
  content can grow taller than the map, and since sidebar + map are flex
  siblings in one row (`md:flex-row`), the row's height may be getting
  driven up by the taller sidebar rather than each column scrolling
  independently.
- Less likely but worth ruling out: the new `MapLayerControls` horizontal
  strip (top-of-map chips) wrapping instead of scrolling at narrow
  viewport widths.

**Needs**: reproduce with several datasets expanded at once, confirm which
element is actually the culprit, then give the sidebar its own
`max-height` + `overflow-y-auto` (most likely fix) independent of the map
column's height.

**Confirmed also affects the SIMPLE view** (`/`, `MapstackApp.tsx`), not
just `/advanced` — a follow-up screenshot with 5 active layers shows the
"Active layers" sidebar list AND the per-layer full-height gradient
legends (`LayerLegends.tsx`/`GradientLegend.tsx`, one tall bar per layer,
no cap) stacked indefinitely, pushing the map down/right well past the
viewport. This is the OLDER, pre-existing pattern (not something this
session introduced) and is now confirmed the more severe instance of the
two, since gradient bars are much taller per-item than the advanced view's
checkbox rows. Same fix shape applies: cap sidebar height, scroll
independently of the map.

## 5. (Done this session, noted for completeness) Insights should be visible from both Map and Table view

Operator: "I really liked the insights — I think that should be at the
bottom of the map view as well... the map and table are just displaying
the data differently while we leave the insights ability to see
methodologies, legends, keys, etc [available regardless]." Framing:
Insights (and by extension things like methodology links) are cross-cutting
context that shouldn't disappear just because you switched from Table to
Map. Implemented directly (see `PowerUserPanel.tsx`) rather than backlogged,
since it was a small, unambiguous relocation.

## 6. Bring more of /advanced's power into the simple view (future direction)

Operator: "I kinda love the simple view more and easier if it just had the
features some of the other does -- we'll have to iterate on that in the
future." Explicitly deferred, not a task for now. Worth remembering the
simple view (`/`, `MapstackApp.tsx`) is the preferred day-to-day surface,
so future power-user features should be evaluated for "could/should this
live in the simple view too" rather than assuming `/advanced` is always
the right home for new capability.

## Not a bug, answered directly (see chat)

- **Why 168 cities, and why this specific set**: ~150 largest US
  cities/metros by population, plus ~18 small towns the original
  allergy-locator author added as personal relocation-candidate /
  ground-truth-validation towns (Sundance WY, Geraldine MT, etc.) —
  inherited unchanged from allergy-locator's spine
  (`scripts/gen_spine.py`). Not a neutral/stratified national sample; a
  hand-curated set sized for per-city methodology quality over raw
  coverage. Expanding the spine (more/different cities) is a separate,
  real option if desired but changes every dataset's join key, so it's a
  bigger decision than adding a new dataset.
