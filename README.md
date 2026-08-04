# Mapstack

Open-source US map layers: pick datasets, overlay them, find what matters to you —
visiting, relocating, proving a point, spotting correlations. One map engine, any
number of pluggable data layers.

> ⚠️ **Directional, not authoritative.** Every layer documents its own sourcing and
> limitations. Nothing here replaces official records, professional advice, or your
> own research.

## Why this exists

This project generalizes [`allergy-locator`](https://github.com/mdostal/allergy-locator),
which shipped a real, working US severity map for allergens — city-level heatmaps,
per-allergen overlays, a composite personal score, and a saved-profile compare feature.
Once a **second** real dataset (healthcare access) was built the same way, the shared
shape between the two became clear enough to actually generalize, rather than guessing
at an abstraction from a single case. That's what this repo is: the generalized engine,
built from two real, working examples instead of upfront design.

## Principles (carried over from allergy-locator)

- **Fully open source (MIT).** Assume every file is public — no secrets, ever.
- **Cost ≈ $0.** Static site generation; no required backend, no required API key.
- **Transparent scoring.** Every layer decomposes into its components with a plain-
  language methodology doc. No black boxes, no claimed precision beyond what the
  underlying data supports.
- **Gradients, not buckets.** Continuous heatmaps on granular data with visible
  confidence — never state fills or a single scary headline number.
- **A dataset is a wrapper, not a rewrite.** Adding a new layer means implementing one
  small interface (points + a 0-100 value + a color ramp + a methodology doc), not
  building a new map from scratch.

## What's here so far

- **A generalized `Dataset` interface** (`src/lib/datasets/types.ts`), proven against
  seventeen genuinely different real implementations across the full 512-city spine, all
  free and keyless:
  - **Allergy severity** — climate/season-modeled score, grass plus 28 comprehensive
    allergens (`data/allergy-scoring.md`, `data/allergens-scoring.md`).
  - **Crime** — real FBI Crime Data Explorer rates, violent and property, with real
    2020–2024 year-over-year history (`data/crime-methodology.md`).
  - **Care access** — nearest-hospital drive time, general/pediatric-specialty/
    pediatric-cardiac (`data/care-access-methodology.md`).
  - **Natural hazard risk** — FEMA National Risk Index, overall plus inland flood/
    coastal flood/wildfire (`data/hazard-methodology.md`).
  - **Social vulnerability** — CDC/ATSDR SVI composite plus 4 sub-themes
    (`data/svi-methodology.md`).
  - **Health outcomes** — CDC PLACES chronic-disease prevalence: asthma, obesity,
    diabetes, depression, high blood pressure (`data/health-methodology.md`).
  - **Food access** — USDA Food Access Research Atlas, share of a population far from
    a supermarket (`data/food-access-methodology.md`).
  - **Housing supply** — Zillow For-Sale Inventory, listings per capita
    (`data/housing-inventory-methodology.md`).
  - **Housing market speed** — Zillow Mean Days to Pending
    (`data/days-on-market-methodology.md`).
  - **Traffic safety** — motor-vehicle crash death rate, County Health Rankings /
    NCHS-NVSS mortality data (`data/traffic-fatalities-methodology.md`).
  - **Transit access** — public transit service level, FTA National Transit Database,
    joined by real Census Urban Area ID (`data/transit-access-methodology.md`).
  - **Walkability** — EPA National Walkability Index, queried directly from EPA's own
    hosted ArcGIS FeatureServer (`data/walkability-methodology.md`).
  - **Park access** — Trust for Public Land ParkServe, percent of residents within a
    10-minute walk of a park (`data/parks-methodology.md`).
  - **Electoral competitiveness** — real 2024 county presidential margins (MIT Election
    Data + Science Lab), framed as competitiveness/one-party-dominance, deliberately NOT a
    left/right lean score (`data/political-lean-methodology.md`).
  - **Broadband access** — real Census ACS broadband-subscription rates, via County
    Health Rankings' free republication -- the first Census-cluster item unblocked without
    a Census API key (`data/broadband-methodology.md`).
  - **Median household income** — real Census ACS income figures, same free republication
    route as broadband -- the second Census-cluster item unblocked
    (`data/income-methodology.md`).
- **Stack any number of layers at once.** Add an allergy layer, add a crime layer, add
  more — each renders as its own gradient with its own color identity, all on one map,
  via "+ Add layer." Not a one-dataset-at-a-time picker.
- **A shared year control** wherever real historical data exists — crime currently
  spans 2020–2024 real years (`data/crime-methodology.md`), with coverage that honestly
  grows year over year as more police agencies joined federal reporting, never
  backfilled or estimated for years without real data.
- A power-user `/advanced` view: a sortable/filterable comparison table across every
  active layer, CSV export, saved views, and a live formula editor for grass severity's
  own component weights — all reading from a real SQLite database (`sql.js`/WASM) built
  at deploy time, not a hand-rolled query layer.
- Every dataset ships its own methodology doc naming its real sourcing and limitations,
  including the honest gaps (a non-participating agency, a suppressed tract, a city
  below a source's reporting threshold) — see `data/*-methodology.md`.

## What's next

The Census-cluster datasets (population, income, broadband, property tax, at full
~19,500-place resolution) are designed but blocked on a free, self-serve
`CENSUS_API_KEY` (see `.pHive/epics/data-store/docs/full-resolution-spine-research.md`
for the lazy-load design once that's available). Beyond that: more free, keyless real
datasets as good candidates turn up (`.pHive/epics/data-store/docs/dataset-backlog.md`
tracks research on ~25 candidates, ranked by real-world feasibility and effort), and
continuing to port allergy-locator's fuller daily/seasonal resolution into this same
generalized interface. See `.pHive/planning/roadmap.md` (v5) in the allergy-locator
repo for the fuller reasoning this project grew out of.

## Stack

Next.js (SSG), Tailwind CSS v4, Vitest + Playwright, zero required backend — same
foundation as allergy-locator.

## License

MIT — see [`LICENSE`](LICENSE).
