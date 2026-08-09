# Housing supply — methodology

The ninth real Mapstack dataset, and the simplest join built so far: a direct city/state
name match, no geocoding crosswalk needed at all.

## What this measures

One layer, **Housing market tightness**, 0–100, higher = more concerning (tighter market,
fewer homes for sale relative to population):

- **Raw input**: Zillow's own count of active for-sale single-family/condo listings in a
  city, for a given real month.
- **Normalization**: divided by the city's own CURRENT population (`data/cities.json`'s
  `pop` field — already used by `crime.ts`'s rate computation, no Census API key needed) to
  get listings per 1,000 residents. A raw listing count alone is meaningless across city
  sizes — 50 active listings means something very different in a town of 2,000 than a
  city of 2 million.
- **Direction**: LOWER listings-per-capita is more concerning (tighter supply, harder to
  find a home) — inverted via percentile rank among covered cities, the same "percentile
  among covered cities" convention `crime.ts` established, computed independently PER YEAR
  at generation time (`concern` field in `data/housing-inventory.json`), not re-derived by
  the app.

Real multi-year history — **2018–2026** (`supportsTime: true`), per explicit operator
direction to get "as much data as possible" for real trends over time.

## Data source

[Zillow Research Data](https://www.zillow.com/research/data/), "For-Sale Inventory" (City,
single-family + condo, smoothed, monthly) — a free, direct CSV download requiring no API
key, login, or account, updated monthly. Fetched from
`files.zillowstatic.com/research/public_csvs/invt_fs/City_invt_fs_uc_sfrcondo_sm_month.csv`
directly.

## Method

Direct name join: each spine city's `city`/`state` fields are matched against Zillow's own
`RegionName`/`State` columns (`scripts/gen_housing_inventory_data.py`). Two real,
documented name-format quirks are normalized before joining:

- Zillow spells out "Saint" rather than abbreviating "St." (e.g. "Saint Louis", not
  "St. Louis").
- Zillow strips apostrophes from names like "Lee's Summit" -> "Lees Summit" -- except
  "O'Fallon", which Zillow renders as "O Fallon" (a space, not a plain removal) --
  inconsistent enough between the two that it's handled as a small, named override
  (`NAME_OVERRIDES`), the same posture `crime.ts`'s `CITY_NAME_OVERRIDES` already
  established for its own real per-city name quirks.

**Real multi-year extension** (this session): the same Zillow CSV already fetched for the
original single-snapshot build turns out to be a full monthly time series back to
2018-03 — confirmed live, no new source or fetch needed. For each real calendar year,
December's real reading is used (the most recent full-year snapshot); if December itself
is a real reporting-lag gap for a given city/year (most commonly the current, still-partial
year), the script falls back to the latest real month reported within that year.

## Known limitations (shown, not smoothed over)

- **510/512 real coverage** — South Fulton, GA (incorporated 2017, may not yet have its
  own distinct Zillow market series) and Geraldine, MT (Zillow requires a minimum
  transaction/listing volume to report a market at all — this small town falls below that
  threshold) have no Zillow-reported listing series at all, in any real year. Honestly
  null, not a forced value.
- **Market tightness is not the same as desirability** — a real tension worth naming
  explicitly: very low supply can reflect a place being highly sought-after, not
  distressed. This score measures how hard it currently is to find something on the
  market, not whether that's a good or bad thing for the place itself.
- **Single-family + condo only** — doesn't capture multi-family/apartment rental
  availability, a different (and, for renters, arguably more relevant) supply question.
- **Current population used for every real year's per-capita denominator** — this dataset
  doesn't have a historical per-year population series wired in, so a real 2018 listing
  count is divided by the city's CURRENT population, not its real 2018 population. A known,
  disclosed simplification, not a fabricated historical population.

## Reproducing this dataset

```
python3 scripts/gen_housing_inventory_data.py
```

Writes `data/housing-inventory.json` with every real year 2018-2026. Caches the raw Zillow
CSV under `data/raw/housing-inventory-cache/` (gitignored — pure fetch-scratch, safe to
delete and re-fetch any time; re-fetching picks up whatever the latest published month is).
