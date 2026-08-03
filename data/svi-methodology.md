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
this dataset just rescales to 0–100, no inversion or re-normalization needed.

## Data source

[CDC/ATSDR Social Vulnerability Index (SVI) 2022](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html),
the most recent release as of this build. U.S. government data — public domain, free to
use and redistribute. Fetched from CDC's own free, keyless ArcGIS FeatureServer
(`onemap.cdc.gov/onemapservices/.../CDC_ATSDR_Social_Vulnerability_Index_2022_USA/FeatureServer/8`),
84,120 US tracts total — only the ~511 tracts the spine actually needs are fetched, via
batched `WHERE FIPS IN (...)` queries, not the full national table.

## Method

1. **Tract crosswalk** (`scripts/extract_city_tracts.py`): each spine city's census tract
   GEOID is extracted from the Census Geocoder responses ALREADY cached by
   `hazard-methodology.md`'s county-crosswalk step (`geocode_city_counties.py`) — the same
   API call returns both county and tract geography in one response, so this step makes
   **zero new network requests**, just a re-parse of data already on disk.
2. **SVI fetch** (`scripts/gen_svi_data.py`): the ~511 unique tracts are fetched in batches
   of 100 via POST (`WHERE FIPS IN (...)`), cached, then joined to each city.

## Known limitations (shown, not smoothed over)

- **Tract-level, not city-level** — a real, documented resolution limitation, same "one
  number for a whole jurisdiction" shape as crime's one-agency and hazard's one-county
  caveats. A large city can contain tracts with very different vulnerability levels; this
  dataset reports whichever single tract each city's given lat/lon coordinate falls in.
- **SVI suppresses unreliable small-population tracts** with its own `-999` sentinel —
  preserved here as an honest `null`, never coerced to a fabricated 0. 3 of 512 spine
  cities hit this in the 2022 release.
- **Static snapshot, not time-varying** (`supportsTime: false`) — SVI is republished
  periodically (2000, 2010, 2014, 2016, 2018, 2020, 2022 to date), not on a fixed annual
  cadence Mapstack could track like crime's year-by-year history.
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
python3 scripts/extract_city_tracts.py  # writes data/raw/city-tract-fips.json (no network calls)
python3 scripts/gen_svi_data.py         # writes data/svi.json
```

Requires `data/raw/geocode-cache/` to already exist (built by
`geocode_city_counties.py` for the hazard dataset) — `extract_city_tracts.py` re-parses
those cached responses rather than re-fetching. Caches its own raw batch responses under
`data/raw/svi-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch any
time).
