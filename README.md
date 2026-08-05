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
  twenty-six genuinely different real implementations across the full 512-city spine,
  all free (all but crime, property tax, unemployment, air quality, and population
  change also keyless):
  - **Allergy severity** — climate/season-modeled score, grass plus 28 comprehensive
    allergens (`data/allergy-scoring.md`, `data/allergens-scoring.md`).
  - **Crime** — real FBI Crime Data Explorer rates, violent and property, with real
    2020–2025 year-over-year history (`data/crime-methodology.md`).
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
  - **Housing affordability** — real Census ACS severe housing-cost-burden rates, the
    third Census-cluster item unblocked -- a genuinely different housing angle from the
    two Zillow-sourced layers above (`data/housing-cost-burden-methodology.md`).
  - **Extreme heat** — average days per year above 90°F, real NOAA 1991–2020 Climate
    Normals, nearest-station matched to all 512 cities with no API key at all
    (`data/heat-methodology.md`).
  - **Sales tax** — real combined state + local sales tax rate, Tax Foundation
    city-level data where published, a real state average fallback otherwise, full
    512-city coverage with no API key (`data/sales-tax-methodology.md`).
  - **Measured grass pollen** — real (not modeled) elevated-grass-pollen-day counts
    from a real county health department pollen station, a genuinely separate signal
    from allergy severity's modeled score. Intentionally sparse (7/512 cities, the
    Twin Cities MN metro) rather than a fabricated national estimate
    (`data/measured-grass-pollen-methodology.md`).
  - **State income tax** — real state individual income tax rate at each city's own
    real median household income, not the top bracket. State-level only, full
    512-city coverage with no API key (`data/income-tax-methodology.md`).
  - **Property tax** — real effective property tax rate (median taxes ÷ median home
    value), the first dataset pulled directly from the Census API rather than a free
    republication route, unblocked by a real `CENSUS_API_KEY`
    (`data/property-tax-methodology.md`).
  - **Unemployment** — real BLS Local Area Unemployment Statistics, city-level where
    available, county fallback otherwise, full 512-city coverage, unblocked by a real
    `BLS_API_KEY` (`data/unemployment-methodology.md`).
  - **Air quality** — real current-conditions AQI (PM2.5/ozone, worse of the two) from
    EPA AirNow, unblocked by a real `EPA_AIRNOW_API_KEY`. 459/512 coverage, with the
    rest a real, recoverable rate-limit gap, not a fabricated value
    (`data/air-quality-methodology.md`).
  - **Population change** — real 5-year population growth/decline, the last of the
    original five Census-cluster items, real Census ACS data (Census PEP's own
    place-level product appears to have moved for recent vintages, confirmed live)
    (`data/population-change-methodology.md`).
- **Stack any number of layers at once.** Add an allergy layer, add a crime layer, add
  more — each renders as its own gradient with its own color identity, all on one map,
  via "+ Add layer." Not a one-dataset-at-a-time picker.
- **A shared year control** wherever real historical data exists — crime currently
  spans 2020–2025 real years (`data/crime-methodology.md`), with coverage that honestly
  grows year over year as more police agencies joined federal reporting, never
  backfilled or estimated for years without real data.
- A power-user `/advanced` view: a sortable/filterable comparison table across every
  active layer, CSV export, saved views, a live formula editor for grass severity's own
  component weights, and a custom blend tool — combine any 2+ active layers at weights
  YOU choose into an opt-in, clearly asterisked overlay, never a shipped default score
  — all reading from a real SQLite database (`sql.js`/WASM) built at deploy time, not a
  hand-rolled query layer.
- Hide datasets you don't care about from the add-layer pickers (Manage datasets, both
  views) — pure declutter, never touches layers you've already added.
- Every dataset ships its own methodology doc naming its real sourcing and limitations,
  including the honest gaps (a non-participating agency, a suppressed tract, a city
  below a source's reporting threshold) — see `data/*-methodology.md`.

## What's next

All five original Census-cluster items (population, income, broadband, property tax,
housing-cost-burden) are now real and shipped, three of them (population, property tax)
pulled directly from a real `CENSUS_API_KEY` this session, the rest via County Health
Rankings' free republication route. Also newly unblocked this session:
`BLS_API_KEY` (unemployment) and `EPA_AIRNOW_API_KEY` (air quality) — both shipped.
`BEA_API_KEY` (cost of living / Regional Price Parities) is in hand but not yet built.
Full ~19,500-place resolution (beyond the 512-city spine) remains a separate, larger
lift — see `.pHive/epics/data-store/docs/full-resolution-spine-research.md` for the
lazy-load design. Beyond that: more free real datasets as good candidates turn up
(`.pHive/epics/data-store/docs/dataset-backlog.md` tracks research on further
candidates, ranked by real-world feasibility and effort), and continuing to port
allergy-locator's fuller daily/seasonal resolution into this same generalized interface.
See `.pHive/planning/roadmap.md` (v5) in the allergy-locator repo for the fuller
reasoning this project grew out of.

## Stack

Next.js (SSG), Tailwind CSS v4, Vitest + Playwright, zero required backend — same
foundation as allergy-locator.

## License

MIT — see [`LICENSE`](LICENSE).
