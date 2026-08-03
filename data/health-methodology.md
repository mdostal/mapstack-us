# Health outcomes — methodology

The seventh real Mapstack dataset: CDC PLACES chronic-disease-prevalence measures,
joined at census **place** level (incorporated city/town, or Census Designated Place for
unincorporated communities).

## What this measures

Five separate layers, all percentages (age-adjusted prevalence), higher = more concerning:

- **Asthma** — current asthma prevalence among adults.
- **Obesity** — obesity prevalence among adults.
- **Diabetes** — diagnosed diabetes prevalence among adults.
- **Depression** — depression prevalence among adults.
- **High blood pressure** — diagnosed high blood pressure prevalence among adults.

Kept SEPARATE, not blended into one composite — same "don't invent a weighting" principle
`crime.ts`/`hazard.ts`/`svi.ts` all use. These 5 were picked from CDC PLACES' full 40-measure
catalog specifically because they're all direction-obvious (higher = worse) with no
inversion needed — several other PLACES measures (Annual Checkup, Mammography, Cholesterol
Screening) are PROTECTIVE (higher = better) and were deliberately excluded rather than
silently inverting them.

## Data source

[CDC PLACES](https://www.cdc.gov/places/) (Population Level Analysis and Community
Estimates), place-level, "Age-adjusted prevalence" — the standard cross-place-comparable
metric CDC itself recommends over crude prevalence. U.S. government data — public domain,
free to use and redistribute. Fetched from CDC's own free, keyless Socrata API
(`data.cdc.gov/resource/eav7-hnsx.json`), 2.15M total rows nationally (every place × every
measure × every year × both prevalence types) — only the ~509 places the spine needs are
fetched, via batched `WHERE locationid IN (...)` queries.

## Method

1. **Place crosswalk** (`scripts/extract_city_places.py`): each spine city's census PLACE
   GEOID is extracted from the Census Geocoder responses ALREADY cached by
   `hazard-methodology.md`'s county-crosswalk step (`geocode_city_counties.py`) — the same
   API call returns "Incorporated Places"/"Census Designated Places" geography alongside
   county and tract, so this step makes **zero new network requests**.
2. **PLACES fetch** (`scripts/gen_health_data.py`): the ~509 unique places are fetched in
   batches of 100, for both the 2023 and 2022 releases, then joined to each city — 2023
   preferred, 2022 used only to fill a gap where a specific place has no 2023 row for a
   given measure.

## Known limitations (shown, not smoothed over)

- **Place-level, not always the exact map boundary** — the census place GEOID reflects
  whichever incorporated place or CDP the city's own lat/lon coordinate falls in; usually
  the intuitive match, occasionally a real, small mismatch for cities with unusual
  boundaries.
- **3 cities have no place-level geography at all** (Savannah GA, Kenosha WI, Sundance
  WY) — the Census Geocoder's coordinates lookup returned neither an Incorporated Place nor
  a CDP for these specific coordinates. Honestly null on every layer, not a forced value.
- **A real per-place data-vintage gap**: most places report the 2023 PLACES release, but a
  number of specific places (Philadelphia, Louisville, Lexington, Pittsburgh, Allentown,
  Reading, Erie, Bethlehem, Bowling Green, among the spine's cities) only have a 2022 row
  for at least one of these 5 measures — recorded per-measure (`{measure}_year` in
  `data/health.json`), never silently normalized to a single shared year the way `year`
  works for crime's real annual history.
- **12 cities have no value for any of these 5 measures, for two distinct real reasons** —
  the 3 with no place-level geography above (Savannah, Kenosha, Sundance — never had a
  PLACES row to check in the first place), plus **9 more that DO have a matched place, but
  whose PLACES rows cover a different subset of the 40 available measures** (dental/
  screening/sleep measures, not the chronic-disease-outcome ones this dataset surfaces) —
  Philadelphia, Louisville, Lexington, Pittsburgh, Allentown, Reading, Erie, Bethlehem, and
  Bowling Green — verified directly against the CDC API for these 9 specifically (not a
  join bug). Both are honest, confirmed gaps, not smoothed over, but naming them under one
  undifferentiated "12" would have overstated how many were actually re-checked against
  the live CDC API versus never having a place to query at all.
- **Self-reported/survey-based (BRFSS), not a census** — the same underlying-methodology
  caveat CDC applies to all PLACES data; small-population places carry wider margins of
  error, same shape as several other candidates' small-town caveats.
- **Static snapshot per release, not a live yearly-refreshed series** (`supportsTime:
  false`) — CDC republishes PLACES periodically, not on a schedule Mapstack tracks like
  crime's year-by-year history.

## Reproducing this dataset

```
python3 scripts/extract_city_places.py  # writes data/raw/city-place-fips.json (no network calls)
python3 scripts/gen_health_data.py      # writes data/health.json
```

Requires `data/raw/geocode-cache/` to already exist (built by `geocode_city_counties.py`
for the hazard dataset) — `extract_city_places.py` re-parses those cached responses rather
than re-fetching. Caches its own raw batch responses under `data/raw/health-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time).
