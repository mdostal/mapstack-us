# Housing supply — methodology

The ninth real Mapstack dataset, and the simplest join built so far: a direct city/state
name match, no geocoding crosswalk needed at all.

## What this measures

One layer, **Housing market tightness**, 0–100, higher = more concerning (tighter market,
fewer homes for sale relative to population):

- **Raw input**: Zillow's own count of active for-sale single-family/condo listings in a
  city, for the latest month available (June 2026 as of this build).
- **Normalization**: divided by the city's own population (`data/cities.json`'s `pop`
  field — already used by `crime.ts`'s rate computation, no Census API key needed) to get
  listings per 1,000 residents. A raw listing count alone is meaningless across city
  sizes — 50 active listings means something very different in a town of 2,000 than a
  city of 2 million.
- **Direction**: LOWER listings-per-capita is more concerning (tighter supply, harder to
  find a home) — inverted via percentile rank among covered cities, the same "percentile
  among covered cities" convention `crime.ts` established, computed once at generation
  time (`concern` field in `data/housing-inventory.json`), not re-derived by the app.

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

For a city whose absolute-latest month has no reported value yet, the script walks
backward through earlier months until it finds one — a real, minor reporting-lag gap for
a small number of markets, not a bug.

## Known limitations (shown, not smoothed over)

- **2 of 512 spine cities have no Zillow-reported listing series at all**: South Fulton,
  GA (incorporated 2017, may not yet have its own distinct Zillow market series) and
  Geraldine, MT (Zillow requires a minimum transaction/listing volume to report a market
  at all — this small town falls below that threshold). Honestly null, not a forced value.
- **Market tightness is not the same as desirability** — a real tension worth naming
  explicitly: very low supply can reflect a place being highly sought-after, not
  distressed. This score measures how hard it currently is to find something on the
  market, not whether that's a good or bad thing for the place itself.
- **Single-family + condo only** — doesn't capture multi-family/apartment rental
  availability, a different (and, for renters, arguably more relevant) supply question.
- **Static latest-month snapshot, not a live time series** (`supportsTime: false`) — Zillow
  actually publishes a full monthly history back to March 2018, cached in
  `data/raw/housing-inventory-cache/`; only the latest month is surfaced here. Exposing the
  full time series (matching crime's year-by-year history) is a real future direction, not
  attempted in this build.

## Reproducing this dataset

```
python3 scripts/gen_housing_inventory_data.py
```

Writes `data/housing-inventory.json`. Caches the raw Zillow CSV under
`data/raw/housing-inventory-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time; re-fetching picks up whatever the latest published month is).
