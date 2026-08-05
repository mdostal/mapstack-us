# Unemployment — methodology

The twenty-fourth real Mapstack dataset (`dataset-backlog.md` #11), unblocked by a real,
free, self-serve `BLS_API_KEY` (https://data.bls.gov/registrationEngine/).

## What this measures

One layer, **Unemployment rate**, 0–100. Raw input is the real, current local
unemployment rate from BLS's own Local Area Unemployment Statistics (LAUS) program.
Already a meaningful, bounded percentage, directly rescaled onto 0–100 (capped at 12% —
Flint, MI's real observed max, 12.3%, sits just above it), higher rate is more
concerning.

## Data source

[BLS Local Area Unemployment Statistics (LAUS)](https://www.bls.gov/lau/), free API v2,
free self-serve registration key.

## Method — a real detour worth documenting

BLS LAUS series IDs need an "area code" that isn't simply a FIPS code — BLS publishes
its own area-code reference file at `download.bls.gov`, but that specific endpoint
**explicitly blocks automated retrieval**: a direct request returned "Access Denied...
Automated retrieval programs (commonly called 'robots' or 'bots')... [is] prohibited,"
confirmed live, not assumed. That block was respected — no attempt was made to route
around it.

Instead, the area-code format was reverse-engineered from a single known-good example
and confirmed against real live data: `LAU` + area type (`CT` for city/place, `CN` for
county) + FIPS code padded to 13 digits + measure code (`03` = unemployment rate). E.g.
New York City = `LAU` + `CT` + state (36) + place (51000) + six zero-padding digits +
`03` = `LAUCT365100000000003` — confirmed live, real monthly data (5.2% for June 2026).
This means the actual documented, intended-for-automation API (`api.bls.gov`, what the
free key is for) could be used exclusively, with zero dependency on the bot-blocked
reference file.

1. **City-level series**: constructed from `data/raw/city-place-fips.json` (the same
   crosswalk `property-tax.ts` and `health.ts` already use).
2. **County-level fallback**: for any city with no real city-level LAUS series,
   constructed from `data/raw/city-county-fips.json` (512/512 real coverage, already
   built for `hazard.ts`/`broadband.ts`) — the same two-tier honesty pattern
   `sales-tax-methodology.md` already uses.
3. **Batched fetch** (`scripts/gen_unemployment_data.py`): both tiers' series IDs are
   fetched in batches of 50 (BLS API's real per-request cap), not one request per city.
4. **Latest real value**: the most recent non-missing monthly reading per series (June
   2026 for most cities at the time of this build).

## Known limitations (shown, not smoothed over)

- **512/512 real coverage** — 494 cities have their own real city-level LAUS series;
  the other 18 (Arlington VA, Athens GA, Augusta GA, Blanding UT, Durango CO, and
  others) inherit their county's rate instead, explicitly flagged in the detail string.
- **A real, government-verified rate, not modeled** — the same "measured, not estimated"
  standard every other dataset here holds to.
- **Some readings carry a real BLS revision/preliminary flag** (`P` = preliminary,
  `R` = subject to later revision) not currently surfaced in the UI detail string — a
  real, minor precision gap, not a fabrication.
- **A snapshot of the latest available month, not a time series** — this dataset ships
  `supportsTime: false`; a future pass could add real year-over-year history the same
  way `crime.ts` does, since BLS's own API already returns multiple years per series.

## Reproducing this dataset

```
python3 scripts/gen_unemployment_data.py
```

Requires a real `BLS_API_KEY` in `.env` (free registration, see above) and both
`data/raw/city-place-fips.json` and `data/raw/city-county-fips.json` to already exist.
Caches each batch's raw API response under `data/raw/unemployment-cache/` (gitignored —
pure fetch-scratch, safe to delete and re-fetch any time). Writes `data/unemployment.json`.
