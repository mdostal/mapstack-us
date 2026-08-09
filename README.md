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
  forty-two genuinely different real implementations across the full 512-city spine,
  all free and every one of them keyless except crime, property tax, unemployment, air
  quality, population change, and cost of living:
  - **Allergy severity** — climate/season-modeled score, grass plus 28 comprehensive
    allergens (`data/allergy-scoring.md`, `data/allergens-scoring.md`).
  - **Crime** — real FBI Crime Data Explorer rates, violent and property, with real
    2010–2025 year-over-year history (`data/crime-methodology.md`).
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
  - **Electoral competitiveness** — real county presidential margins for every real
    cycle 2000–2024 (MIT Election Data + Science Lab), framed as
    competitiveness/one-party-dominance, deliberately NOT a left/right lean score
    (`data/political-lean-methodology.md`).
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
  - **Measured grass pollen (real, limited coverage)** — real (not modeled) elevated-grass-pollen-day
    counts from a real county health department pollen station, year by year for every
    real year 1993–2020, a genuinely separate signal from allergy severity's modeled
    score. Intentionally sparse (7/512 cities, the Twin Cities MN metro) rather than a
    fabricated national estimate (`data/measured-grass-pollen-methodology.md`).
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
  - **Air quality** — real annual 90th-percentile AQI by county, EPA AQS's own bulk
    annual files, real multi-year history 1980-2025, no key required. 499/512 coverage
    across all years combined (461-487/512 at any single year, the rest a real,
    honest no-monitor-in-that-county gap) (`data/air-quality-methodology.md`).
  - **Population change** — real 5-year population growth/decline, the last of the
    original five Census-cluster items, real Census ACS data (Census PEP's own
    place-level product appears to have moved for recent vintages, confirmed live)
    (`data/population-change-methodology.md`).
  - **Cost of living** — real BEA Regional Price Parities, unblocked by a real
    `BEA_API_KEY`. Required building a brand-new city→CBSA crosswalk from the Census
    Bureau's own delineation file since BEA only publishes at the metro/state level,
    with a real state-level fallback for cities outside any metro area
    (`data/cost-of-living-methodology.md`).
  - **School spending** — real per-pupil school district finance data, NCES Common
    Core of Data via the Urban Institute's keyless Education Data Portal API. Upgrades
    the dataset backlog's former "weak, proxy-only" school-quality candidate to a real,
    direct government-finance number, enrollment-weighted to county level
    (`data/school-spending-methodology.md`).
  - **Business density** — real Census Business Patterns establishment density per
    capita, county-level (no city-level product exists for this Census dataset),
    pivoted in after EPA TRI proved impractically slow to bulk-fetch live
    (`data/business-density-methodology.md`).
  - **Industrial facility density** — real EPA Toxics Release Inventory facility
    proximity, the real fix for the slow-live-API blocker above: a separate,
    purpose-built bulk download returns the complete national file in one ~60s
    request, joined by real lat/lon with no crosswalk needed at all
    (`data/tri-facility-density-methodology.md`).
  - **Average wage** — real Census Business Patterns average annual wage per
    employee, reusing the business-density pipeline with zero new endpoint risk,
    genuinely distinct from median household income and business density
    (`data/average-wage-methodology.md`).
  - **Drought severity** — real US Drought Monitor county-level severity, real
    multi-year history 2000-2026 (annual average of real weekly readings), a joint
    NOAA/USDA/University of Nebraska-Lincoln product, no API key, already a
    natively bounded percentage with no rescale needed
    (`data/drought-methodology.md`).
  - **Hate crime rate** — real FBI hate crime statistics, resolving a lead deferred
    across three prior research rounds once the real endpoint was found by
    rendering FBI CDE's JS-based docs page; reuses crime.ts's existing ORI
    crosswalk and cached population data entirely
    (`data/hate-crime-methodology.md`).
  - **Superfund site density** — real EPA National Priorities List site density,
    resolving another long-deferred lead via the same documentation-rendering
    technique: a newer Envirofacts API base and program-prefixed table names
    (`data/superfund-methodology.md`).
  - **Seismic risk** — real USGS ASCE 7-22 seismic design values, the same
    standard values real building codes use, a genuinely new hazard category
    (earthquake, distinct from `hazard.ts`'s flood/wildfire), zero crosswalk
    needed at all (`data/earthquake-methodology.md`).
  - **Library access** — real IMLS Public Libraries Survey visits per capita,
    resolving a lead deferred twice this session; a radius-based join against
    real lat/lon (not the source file's own unreliable administrative
    city-name field) lifted real coverage from 77% to 93%
    (`data/library-access-methodology.md`).
  - **Severe weather frequency** — real NOAA Storm Events Database frequency,
    county-level, a genuinely new hazard signal distinct from the flood/
    wildfire/earthquake layers already shipped
    (`data/severe-weather-methodology.md`).
  - **Gigabit availability** — real FCC National Broadband Map gigabit-tier
    availability, distinct from the ACS subscription-rate broadband dataset
    already shipped (availability vs. adoption); the FCC's own official
    100/20 Mbps standard turned out already >99.6% available everywhere in
    this spine, so this uses the gigabit tier instead for real differentiation
    (`data/broadband-speed-methodology.md`).
  - **Historic site access** — real NPS National Register of Historic Places
    density within 10 miles, via a live server-side ArcGIS spatial radius
    query (no bulk download, no local haversine — a first for this project's
    radius-join datasets); fewer nearby sites is more concerning
    (`data/historic-site-density-methodology.md`).
  - **Environmental violations** — real EPA ECHO significant-violation
    facility density within 10 miles; started as a live server-side radius
    query but pivoted mid-build to ECHO's own bulk Exporter file after
    hitting a real documented API rate limit, joined locally via haversine
    (`data/environmental-violations-methodology.md`).
  - **Winter cold burden** — real NOAA 1991-2020 Climate Normals average
    annual freezing-days count, the direct winter-cold complement to the
    extreme-heat dataset, reusing the same real station-matching pipeline
    (`data/winter-cold-burden-methodology.md`).
  - **Electricity cost** — real EIA state-level residential electricity
    retail price, unlocked by a real EIA API key
    (`data/electricity-cost-methodology.md`).
- **Stack any number of layers at once.** Add an allergy layer, add a crime layer, add
  more — each renders as its own gradient with its own color identity, all on one map,
  via "+ Add layer." Not a one-dataset-at-a-time picker.
- **A shared year control** wherever real historical data exists — crime spans
  2010–2025 (`data/crime-methodology.md`), with coverage that honestly grows year over
  year as more police agencies joined federal reporting; electoral competitiveness spans
  every real cycle 2000–2024; measured grass pollen spans every real year 1993–2020.
  Never backfilled or estimated for years without real data.
- **Compare a few cities side by side**, right from the map (pick with "+ Compare," cap
  of 4) — a lighter, map-integrated counterpart to `/advanced`'s full table across all
  512. Rank the cities you're comparing (or all 512) by a user-owned weighted blend of
  your active layers. For any layer with real multi-year history, a real trend chart
  shows how the compared cities' values actually moved over time — never a fabricated
  flat line for the many layers that are honestly current-snapshot-only.
- **Chat with the data (experimental, bring your own key)** — a fully client-side
  assistant, powered by the Vercel AI SDK, that can look up real city/dataset values and
  rankings through a small, fixed set of read-only tools. Visitors supply their own
  Anthropic API key, which is sent directly from their browser to Anthropic and never
  touches any Mapstack server (there isn't one) — the panel discloses exactly what the
  key does and where it goes before anyone enters one.
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
housing-cost-burden) are real and shipped, three of them (population, property tax)
pulled directly from a real `CENSUS_API_KEY`, the rest via County Health Rankings' free
republication route. All four freshly-obtained keys this cycle are now shipped:
`BLS_API_KEY` (unemployment), `EPA_AIRNOW_API_KEY` (air quality), and `BEA_API_KEY`
(cost of living, Regional Price Parities — required building a brand-new city→CBSA
crosswalk since BEA only publishes at the metro/state level).

One real, pending, user-side action remains: the formal NAB (National Allergy Bureau)
pollen data request — a real application process (PI info, abstract, CV, institutional
letter, up to 12 weeks), not a self-serve key, tracked at
`https://allergist.aaaai.org/forms/nab-data-request-form.php`.

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

## API keys (for reproducing the keyed datasets)

Most datasets need no key at all — see each layer's own note above. The handful
that do (Census, BLS, BEA, FBI, Dataverse, NASS, EIA, HUD) are used only
by the one-off Python scripts under `scripts/` that regenerate `data/*.json`;
none are shipped to the client or required to run the app itself (`pnpm dev`/
`pnpm build` work with zero keys against the already-committed data files).
Air quality no longer needs a key either — it moved from EPA AirNow (real-time,
rate-limited) to EPA AQS's own keyless bulk annual files this session, which is
also how it gained real multi-year history back to 1980.

Keys live in a local, gitignored `.env` — never committed, never referenced by
shipped app code (`pnpm test:secrets` enforces this). If you maintain this repo
and already store these keys in GCP Secret Manager, `scripts/load-secrets-from-gcp.sh`
refreshes `.env` from there in one idempotent pass; otherwise just populate `.env`
by hand from each provider's own free registration page.

## License

MIT — see [`LICENSE`](LICENSE).
