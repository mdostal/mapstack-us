# Social vulnerability — methodology

The sixth real Mapstack dataset: CDC/ATSDR's Social Vulnerability Index (SVI), joined at
**census-tract** level (finer than hazard's county-level join) to every spine city.

## What this measures

Five separate layers, all 0–100, higher = more concerning (more vulnerable):

- **Overall social vulnerability** — SVI's composite `RPL_THEMES`, a percentile ranking
  built from 16 socioeconomic/demographic variables across all US tracts.
- **Socioeconomic status**, **Household characteristics**, **Minority status / language**,
  **Housing type / transportation** — SVI's own 4 sub-theme percentiles (`RPL_THEME1`–`4`),
  kept SEPARATE rather than re-blended into the composite above — same "don't invent a
  weighting" principle `crime.ts` and `hazard.ts` both use for their own multi-layer splits.

SVI's own percentile values are already 0–1 and already framed "higher = more vulnerable" —
this dataset just rescales to 0–100, no inversion or re-normalization needed. Percentiles
are computed by CDC independently per real release year (CDC's own documentation
explicitly warns against comparing percentiles across releases), so a value is only
meaningful within its own year, not across years.

Real multi-vintage history — **2010, 2014, 2016, 2018, 2020, 2022** (`supportsTime: true`),
per explicit operator direction to get "as much data as possible" for real trends over
time. CDC has published SVI seven times to date (2000, 2010, 2014, 2016, 2018, 2020, 2022),
not an annual series — this ships six of the seven; see the real, disclosed 2000 gap below.

## Data source

[CDC/ATSDR Social Vulnerability Index (SVI)](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html).
U.S. government data — public domain, free to use and redistribute. Fetched from a single
consolidated, free, keyless ArcGIS FeatureServer
(`onemap.cdc.gov/onemapservices/.../SVI/SVI_consolidated_data/FeatureServer/0`) whose own
service description states it "includes all SVI release years, geographic levels... and
percentile comparisons" — confirmed live: one query for a single real tract FIPS with no
`ReleaseYear` filter returned all 7 real vintages' rows at once, replacing the original
single-vintage build's per-year-specific-service approach entirely.

## Method — a real architecture change mid-extension

1. **Two real tract crosswalks, reused as-is**: CDC's own documentation ("Data changes over
   time" section on the page above) confirms census tracts are redrawn at each decennial
   census, and groups the seven SVI releases into three real boundary generations — SVI 2000
   uses unique 2000-census tracts; **SVI 2010/2014/2016/2018 share the same 2010-census
   tracts**; **SVI 2020/2022 share the same current (2020-census) tracts**. This dataset
   already had a current-vintage crosswalk (`city-tract-fips.json`, its own original) and a
   2010-vintage crosswalk (`city-tract-fips-2010.json`, built for `food-access.ts`) — both
   reused here with zero new geocoding, covering six of the seven real releases.
2. **Consolidated SVI fetch** (`scripts/gen_svi_data.py`): the union of every unique tract
   FIPS needed across both crosswalks is fetched in batches of 100 via POST
   (`WHERE FIPS IN (...) AND GeoLevel='tract' AND Comparison='national'`), with no
   `ReleaseYear` filter — every real year for every needed tract comes back in the same
   batch of requests. Each city then looks up its per-year value using whichever crosswalk
   matches that year's real boundary generation.

## Known limitations (shown, not smoothed over)

- **2000 is a real, disclosed gap, not shipped** — it requires its own third crosswalk
  generation (unique 2000-census tract boundaries), and the Census Geocoder (this project's
  only tract-crosswalk tool) has no `Census2000_*` vintage option — confirmed live against
  its own `/geocoder/vintages` endpoint, whose real vintage list starts at
  `Census2010_Current`. Rather than approximate 2000 with a mismatched boundary vintage
  (which would silently misjoin tracts, the same class of bug the food-access dataset's own
  methodology found and fixed), this year is left out entirely.
- **Tract-level, not city-level** — a real, documented resolution limitation, same "one
  number for a whole jurisdiction" shape as crime's one-agency and hazard's one-county
  caveats. A large city can contain tracts with very different vulnerability levels; this
  dataset reports whichever single tract each city's given lat/lon coordinate falls in.
- **SVI suppresses unreliable small-population tracts** — preserved here as an honest
  `null`, never coerced to a fabricated 0. A small number of spine cities hit this in any
  given real release (e.g. 2020: 505/512 cities have a real tract entry for that year at
  all — 7 real gaps — but 3 more of those 505 have an entry present with `overall` itself
  suppressed to `null`, so real non-null `overall` coverage for 2020 specifically is
  502/512; a real doc/data distinction found live by this project's own QA sweep, not a
  bug — both numbers are real and visible in `data/svi.json`'s own per-year data).
- **Conceptual overlap with other candidate datasets** — SVI is built partly from the same
  underlying ACS variables income/broadband/housing datasets would use, since it draws on
  overlapping Census inputs. Shipped anyway because the COMPOSITE framing (aggregate
  "how exposed to crisis" signal) is a genuinely distinct product from any single raw
  variable, even where inputs overlap.
- **A composite score can't distinguish WHICH factor drives it** — the same caveat
  `hazard-methodology.md` documents for FEMA NRI's composite: two tracts can land at the
  same "Overall" percentile for very different underlying reasons. This is why the 4
  sub-themes are shipped as their own separate layers.

## Reproducing this dataset

```
python3 scripts/extract_city_tracts.py       # writes data/raw/city-tract-fips.json (no network calls)
python3 scripts/geocode_city_tracts_2010.py  # writes data/raw/city-tract-fips-2010.json
python3 scripts/gen_svi_data.py              # writes data/svi.json
```

Requires `data/raw/geocode-cache/` to already exist (built by
`geocode_city_counties.py` for the hazard dataset) — `extract_city_tracts.py` re-parses
those cached responses rather than re-fetching. Caches its own raw batch responses under
`data/raw/svi-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch any
time).
