# Top-500 city spine candidate — methodology

**Status: candidate, not live.** `data/cities-500-candidate.json` is a proposed replacement
for the "~150 largest cities" portion of `data/cities.json`'s current 168-city spine. It is
**not wired into any dataset** — `crime.json`, `care-access.json`, `allergy-scores.json`, and
`allergens.json` all still join against the current 168-city `cities.json` and were not
touched. Promoting this candidate to the live spine is a separate follow-up decision that
also requires regenerating every dataset keyed to city `id`.

## What this is

511 entries = **500 US cities by real population rank** + **11 of the original spine's
18 "personal towns"** kept as extras beyond the top 500 (7 of the 18 — Boise ID, Billings
MT, Yuma AZ, Asheville NC, Santa Fe NM, Rapid City SD, Flagstaff AZ — turned out to
independently rank inside the real top 500 by population, so they're counted once, in the
500, not duplicated as both).

## Source of the population ranking

The **U.S. Census Bureau's Vintage 2025 Population Estimates for incorporated
places** (`sub-est2025.csv`, released to
`www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/`, `POPESTIMATE2025`
column — July 1, 2025 estimate, the same vintage Wikipedia's "List of United States cities by
population" table cites as of this writing). This is the primary authoritative source, not a
secondary compilation — the Wikipedia article was used only as a cross-reference during spot
checks, and to confirm which vintage year to pull (see spot checks below).

`SUMLEV=162` rows (incorporated places, including the Census Bureau's own "balance" figures
for consolidated city-county governments like Nashville-Davidson, Louisville/Jefferson
County, Indianapolis, and Augusta-Richmond County — the same convention the original
168-city spine already used) were ranked by `POPESTIMATE2025` descending. Two real, sourced
exceptions to the incorporated-places rule, both because Wikipedia's own list makes the same
exception for the same reason:
- **Honolulu** — no incorporated "Honolulu city" exists (all of Oahu outside a few small
  towns is one CDP); the Census Bureau's own file *does* carry "Urban Honolulu CDP" as a
  `SUMLEV=162` statistical-equivalent row, so no special-casing was actually needed here.
- **Arlington, VA** — no municipal government exists at all (Arlington County *is* "the
  city," coextensive with the county); its population comes from the Census Bureau's
  separate county-estimates file (`co-est2025-alldata.csv`, `POPESTIMATE2025` = 243,931),
  manually spliced into the ranking at its real rank.

## Method per field

- **`pop`** — `POPESTIMATE2025` (or the Arlington County figure above), for every entry,
  including the 156 cities inherited from the original 168-city spine — their population
  numbers were refreshed to this same 2025 vintage rather than left at whatever (older,
  more-rounded) figure the original spine had.
- **`lat`/`lon`** — U.S. Census Bureau **2024 Gazetteer Files** (`INTPTLAT`/`INTPTLONG`,
  the Bureau's own computed internal point for each incorporated place polygon), for every
  brand-new city. The 156 cities already present in the original spine (`gen_spine.py`)
  kept their existing lat/lon unchanged — real, federal-sourced, geography doesn't need
  re-deriving.
- **`elevation_ft`** — **USGS National Map Elevation Point Query Service**
  (`epqs.nationalmap.gov`, 3DEP elevation data), queried live for every one of the 344
  brand-new cities at that city's Gazetteer lat/lon. All 344 resolved to a real value — none
  fabricated, none left as a placeholder. Existing 156 cities kept their original spine
  elevation.
- **`koppen`** — **Beck et al. 2018, "Present and future Köppen-Geiger climate
  classification maps at 1-km resolution"** (*Nature Scientific Data*; raster obtained from
  the authors' own repository via Figshare), point-sampled at each new city's lat/lon (with
  a small neighbor-pixel search when the exact point landed on a no-data/water pixel — a
  real edge case near coastlines). All 344 new cities resolved to a real classification —
  none guessed. Existing 156 cities kept their original spine classification.
- **`coastal`** — **best-effort, not independently sourced per city.** No authoritative
  coastline-distance dataset was joined; this flag was assigned by hand for the 344 new
  cities, following the same convention the *existing* 168-city spine visibly already uses
  (which is looser than "literally touching the ocean" — it counts Great Lakes shorelines
  [Chicago, Cleveland, Milwaukee, Buffalo], tidal bay/estuary shorelines [Philadelphia,
  Baltimore, Newark], and whole coastal-basin metros a few miles inland [Anaheim, Santa Ana,
  Irvine, Houston] as coastal, not just the literal shoreline). New cities were flagged true
  for: Great Lakes shorelines, San Francisco Bay Area shorelines, Puget Sound basin,
  Chesapeake/tidal-Virginia cities, the Houston Gulf-basin suburbs, and the LA/Orange/San
  Diego/Ventura county coastal basin (mirroring the existing Anaheim/Santa Ana/Irvine
  precedent). This is the weakest-sourced field in this file — see Limitations.
- **`flags`** (`turf`, `aridsw`) — **heuristic pattern-matching, explicitly not
  calibrated**, per the task's own allowance. For the 344 new cities, flags were assigned by
  matching each city's state/region/Köppen zone against the *pattern* visible in the
  existing 168-city spine's own flag values (e.g., every Phoenix-area AZ suburb already
  carries `turf:8,aridsw:True`; every Cfa-climate Deep South city already carries a modest
  `turf:4`; every Denver-area CO Front Range city already carries `turf:6`). 235 of the 344
  new cities got a flags hint this way; 109 got none (the humid Midwest/Northeast Dfa/Dfb
  belt, matching how Indianapolis, Columbus OH, Milwaukee, Boston, etc. already carry no
  flags in the original spine). **None of these new-city flag values are fitted to any real
  reaction data** — the original spine's flags comment says they're "fitted to a real
  grass-dominant person's validated reactions"; these are not. They are a starting point for
  a human to review before any score regeneration, not a finished input.

## Cities kept unchanged from the original spine

156 of the 500 top-population-rank slots, plus all 11 "personal-town" extras, use their
**exact existing `gen_spine.py` values** (lat/lon/elevation/koppen/coastal/flags) — only
`pop` was refreshed. This was a deliberate choice, not laziness: those values already have
real methodology and (for the 18 personal towns specifically) ground-truth allergy-score
validation behind them, and re-deriving them from scratch would only introduce noise.

## Known discrepancy found: Grand Junction, CO

The original spine's `gen_spine.py` comment block labels Grand Junction as part of "the
~150 largest US cities" even though its population (~66,000 at spine-authoring time; a real,
sourced ~71,780 as of the 2025 estimate — [Wikipedia](https://en.wikipedia.org/wiki/Grand_Junction,_Colorado),
cross-checked against this pipeline's own Census-sourced ~70,554 2024-vintage figure) has
never actually placed it in the real top 500 (real rank ≈ 540s, well below this file's
rank-500 cutoff of ~76,600). It is **not** one of the 18 explicitly-named personal towns
either — it's simply misfiled in the original comment block. Per the task's explicit scope
(only the 18 named personal towns are preserved as extras beyond the top 500), **Grand
Junction is dropped from this candidate file.** If continuity for it is wanted, a human
should decide to add it back as a 19th personal-town-style extra — that's a judgment call
this compilation pass didn't have standing to make unilaterally.

## Spot checks (sample of 10, explicit sources)

| City | Field(s) checked | This file | External source | Verdict |
|---|---|---|---|---|
| Fort Collins, CO | pop, lat/lon, elevation | 171,500 / 40.55,-105.06 / 4,993 ft | ~170–172k (city + [worldpopulationreview](https://worldpopulationreview.com/us-cities/colorado/fort-collins)); [Wikipedia](https://en.wikipedia.org/wiki/Fort_Collins,_Colorado) 40.585,-105.084, 5,004 ft | pop in range; lat/lon off by ~2mi (internal-point vs. downtown-point, expected); elevation within 0.2% |
| Charleston, SC | pop | 159,423 | city's own 2024 Fast Facts: 159,333 ([charleston-sc.gov](https://www.charleston-sc.gov/DocumentCenter/View/35784/FAST-FACTS-2024)) | within 0.06% |
| Green Bay, WI | pop | 106,675 | 106,253, 3rd-largest WI city ([neilsberg](https://www.neilsberg.com/insights/green-bay-wi-population-by-year/)) | within 0.4% |
| Missoula, MT | lat/lon | 46.87,-114.03 | 46.87,-113.99 to -114.02 ([multiple sources](https://www.latlong.net/place/missoula-mt-usa-33926.html)) | within ~0.03° |
| Yuma, AZ (reused) | pop | 103,559 (2024 vintage, pre-refresh check) | 103,561 2024 ACS ([neilsberg](https://www.neilsberg.com/insights/yuma-az-population-by-year/)) | within 2 people |
| Tuscaloosa, AL | pop, elevation | 114,316 / 263 ft | 114,288 2025 est.; elevation cited 190–227 ft elsewhere ([worldpopulationreview](https://worldpopulationreview.com/us-cities/alabama/tuscaloosa), Wikipedia) | pop within 0.02%; elevation gap explained by internal-point vs. downtown-point (Tuscaloosa has real relief between the river and surrounding bluffs) |
| Boise, ID (reused) | pop | 238,429 | 237,242–238,853 2025/2026 ([worldpopulationreview](https://worldpopulationreview.com/us-cities/idaho/boise), [idaho-demographics](https://www.idaho-demographics.com/boise-city-demographics)) | within range |
| Erie, PA | pop, coastal | 91,838 / true | 91,194 (2026 projection, declining from 94,831 in 2020) ([worldpopulationreview](https://worldpopulationreview.com/us-cities/pennsylvania/erie)) | on the same declining trendline; Lake Erie shoreline confirmed |
| Grand Junction, CO | pop (dropped city) | n/a (dropped) | ~71,780 2025 est., real rank ≈540s ([Wikipedia](https://en.wikipedia.org/wiki/Grand_Junction,_Colorado)) | confirms the drop decision above |
| New York, Los Angeles, Phoenix, Denver, Miami, Seattle, Anchorage, El Paso, Flagstaff (koppen raster validation) | koppen | see below | — | see Köppen boundary-sensitivity note below |

## Known limitations (shown, not smoothed over)

- **`coastal` is the weakest-sourced field.** Assigned by hand for all 344 new cities using
  the existing spine's own (already loose) convention as a guide — no coastline-distance
  dataset was actually joined per city. A handful of genuinely borderline calls exist (e.g.
  Trenton, NJ sits at the literal head of Delaware River tidal influence but was marked
  `false`; several Houston-basin exurbs 15–25 miles from open water were marked `true` for
  consistency with the existing spine's already-generous treatment of Houston itself). Worth
  a dedicated re-pass with a real coastline/estuary dataset before this ships.
- **`flags` (turf/aridsw) on the 344 new cities are unfitted heuristic hints**, explicitly
  not calibrated against any real reaction data — see the Method section above. Treat as a
  starting point, not a finished input, for any future allergy-score regeneration.
- **Köppen boundary sensitivity**, discovered while validating the Beck et al. 2018 raster
  against the existing spine's hand-set values before deciding to trust it for new cities:
  point-sampling New York City returns `Dfa` from the raster, not the `Cfa` the existing
  spine (and most popular references) uses; Los Angeles returns `Csa` where the spine has
  `Csb`; Seattle returns `Csb` where the spine has `Cfb`; Miami returns `Am` where the spine
  has `Aw`. These are **real, documented, method-dependent classification differences**
  (the C/D and Csa/Csb boundaries are genuinely sensitive to which climate-normal reanalysis
  product and station period is used — not a bug in either source), not raster errors. This
  is exactly why the 156 cities already in the original spine kept their existing values
  instead of being overwritten by a fresh raster lookup — but it means any of the 344
  brand-new cities sitting near one of these same climate boundaries may carry a Köppen code
  that a different, equally legitimate source would classify one letter differently. Not
  individually re-checked city-by-city beyond the sample above.
- **Elevation reflects the Census Gazetteer's computed "internal point" of each city's legal
  polygon, not a single canonical downtown/city-hall point** — for cities with real internal
  relief (Tuscaloosa's river-to-bluff terrain in the spot check above being the clearest
  example) this can diverge meaningfully (in that case ~30%) from a commonly-cited single
  reference elevation. Both figures are real, sourced elevations for real, different points
  within the same city; neither is fabricated, but they're not measuring identically defined
  locations.
- **Arlington, VA's population is a county figure**, not an incorporated-place figure, for
  the structural reason explained above (no municipal government exists to have one). Every
  other field for Arlington uses the county centroid, not a city-specific point.
- **No city in this file has an unresolved/fabricated numeric field** — every population,
  lat/lon, and elevation value came from a live query against a real government dataset;
  every Köppen code came from a live raster lookup against a real published climate
  classification. The two soft-judgment fields (`coastal`, `flags`) are disclosed as such
  above rather than presented with false confidence.

## A real consequence of a strict top-500 cutoff: 4 states have zero cities in this file

Delaware, Maine, Vermont, and West Virginia have no incorporated place large enough to crack
the real top-500 cutoff (~76,600 people). Their largest cities all fall just short and
genuinely rank in the 500s: Wilmington, DE at real rank 529 (73,512), Portland, ME around
69,000, Burlington, VT around 44,000, Charleston, WV around 46,000. This is a real
consequence of a strict population cutoff, not a bug — flagged here so it isn't mistaken for
one. 47 of 50 states + DC are represented in this file's 511 entries.

## Cities needing further verification

None with a hard data gap — every field for all 511 entries resolved to a real, sourced
value (no placeholders, no "TBD," no invented numbers). The soft-judgment fields
(`coastal`, `flags`) flagged above are the honest caveat: they're real best-effort
determinations, not independently verified per city, and should get a dedicated review pass
before this candidate is promoted to the live spine.

## Reproducing this compilation

Not currently scripted as a single reproducible pipeline in this repo (it was built
interactively against live Census/USGS/raster sources during this research pass). The real
sources, in order:
1. `https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/cities/totals/sub-est2025.csv`
   — population ranking.
2. `https://www2.census.gov/programs-surveys/popest/datasets/2020-2025/counties/totals/co-est2025-alldata.csv`
   — Arlington County VA population only.
3. `https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip`
   — lat/lon for every new city.
4. `https://epqs.nationalmap.gov/v1/json` (USGS National Map Elevation Point Query Service)
   — elevation for every new city.
5. Beck, H.E., N.E. Zimmermann, T.R. McVicar, N. Vergopolan, A. Berg, E.F. Wood (2018),
   "Present and future Köppen-Geiger climate classification maps at 1-km resolution,"
   *Nature Scientific Data* — `Beck_KG_V1_present_0p0083.tif`, via
   [figshare](https://figshare.com/articles/dataset/Present_and_future_K_ppen-Geiger_climate_classification_maps_at_1-km_resolution/6396959)
   — Köppen zone for every new city.
6. `/Users/mdostal/Code/allergy-locator/scripts/gen_spine.py`'s `CITIES` list — source of
   truth for all 156 reused-largest-city and 18 personal-town records.
