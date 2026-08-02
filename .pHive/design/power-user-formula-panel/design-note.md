# Design Note: Map Return + Tunable Formula Panel

Triggered by direct operator feedback mid-session: "the advanced view is for
adding data around it, we shouldn't be completely getting rid of the map --
and mostly is around making sure any equation for how we deal with the
coloring, the mapping, etc is provided ... what are those coefficients?"

## What was found before building anything

1. **Multi-layer stacking (the map's existing overlay) has zero data-level
   blending today.** Each active layer renders its own independent SVG
   gradient; 2+ active layers just alpha-composite at a fixed 65% opacity
   (`MultiLayerMap.tsx`). No coefficients exist to expose for this —
   documented instead of built (see the transparency note under the map).
2. **Crime has no formula to tune.** `data/crime-methodology.md` explicitly
   states violent/property crime are "deliberately not blended into one
   score" — no criminological basis for a weighting. Nothing to slide.
3. **Allergy's grass layer has a real, documented, decomposable formula**
   (`data/allergy-scoring.md`): 5 named components
   (`base_season_climate`, `turf_boost`, `arid_weed`, `elevation_discount`,
   `coastal_nudge`) that sum to the shipped score, already stored per-city
   in `data/allergy-scores.json`. The other 27 comprehensive allergens
   (`data/allergens.json`) are a coarser climate-zone-only lookup with no
   decomposition — nothing to tune there either.

This is why the feature is NOT one generic "blending" control — it's three
different, honestly-scoped answers per what actually exists mathematically.

## What was built

- **Map toggle** — `[Map | Table]` tabs in the toolbar (operator's pick from
  three placement options). Map defaults hidden; Export CSV hides in map
  mode (nothing tabular to export).
- **`src/lib/formula/allergy-grass-formula.ts`** — live, re-runnable
  reimplementation of the grass formula's compress/clamp step. Verified
  against all 168 shipped scores (not spot-checked) before any UI was built
  on top of it — `recomputeGrassScore(components, weights=1.0)` must
  reproduce the shipped score exactly for every city.
- **`FormulaPanel.tsx`** — per selected layer: grass gets 5 weight sliders
  (0-2 range, default 1.0) + live recomputed score vs. shipped score;
  every other layer gets a one-line "no tunable formula, see methodology"
  note instead of a fake control.
- **`src/lib/formula-presets.ts`** — named weight-set presets, saved **per
  layer** (explicit operator direction: "save each layer separately"),
  same fail-open localStorage CRUD pattern as `saved-views.ts`.

## Explicit scope boundary: sandbox, not live-wired

The Formula panel's recomputed score is a **transparent preview only** — it
does not change the map's colors, the comparison table's values, CSV
exports, or saved views, which always show the shipped model. Wiring a
custom weight-set into the actual rendered map/table would require every
consumer of `Dataset.getValue()` to become weight-aware (sort, filter, CSV
export, insights SQL store) — a much larger integration deliberately left
for a later pass once this sandbox proves useful. Called out explicitly to
the operator, not left implicit.
