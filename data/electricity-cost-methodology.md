# Electricity cost — methodology

The forty-second real Mapstack dataset (ddr13-1, `data-drive-round-13` epic).
512/512 real coverage at every real year.

## What this measures

One layer, **Electricity cost**, 0–100. Raw input is the real average
residential electricity retail price (cents per kWh) for each city's state, per
year. State-level only — the same honest limit already carried by
`income-tax.ts`, `sales-tax.ts`, and `property-tax.ts` — every spine city in a
state gets that state's real number. Already a meaningful, bounded quantity,
directly rescaled onto 0–100 (capped at 41¢/kWh, a FIXED cap applied identically
to every real year so a state's price stays honestly comparable year to year),
higher price is more concerning.

Real multi-year history — **2001–2025** (`supportsTime: true`), per explicit
operator direction to get "as much data as possible" for real trends over time.
A single EIA API request (`start=2001&end=2025`) returns every real year at
once — confirmed live, 1550 real rows across 25 years — no per-year looping
needed.

## Data source

The [EIA (U.S. Energy Information Administration) API v2](https://www.eia.gov/opendata/),
`electricity/retail-sales` route, residential sector (`sectorid=RES`). Requires a
free, self-serve API key (`eia.gov/opendata/register.php`) — unlocked this
session; also stored in GCP Secret Manager (project `personalsites-487021`,
secret `mapstack-eia-api-key`).

## A real `curl` gotcha (shown, not smoothed over)

EIA's bracket-style query parameters (`facets[stateid][]=NY`, `data[0]=price`)
trip a real `curl` URL-globbing bug: `curl` interprets unescaped `[` `]` as its
own glob syntax and fails with `URL malformed` (exit code 3) unless `--globoff`
is passed. An earlier probe this session (before a real key was available) used
a placeholder key and returned an empty response — at the time this looked like
it might mean the key didn't work, but the real cause was this globbing bug,
confirmed once a real key was available and `--globoff` was added.

A second real bug caught during this build: EIA's response mixes real
state-level rows with census-division/region aggregates (`"PACN"`, `"NEW"`) and
a national total (`"US"`) — several of which happen to also be exactly 2
characters, so an early filter of `len(stateid) == 2` let `"US"` through and
(combined with a too-small `length=60` page size) silently pushed Wyoming's real
row out of the returned page, dropping coverage to 511/512. Fixed by filtering
against the exact set of real state abbreviations `data/cities.json` actually
uses, and raising the page size to comfortably cover all 51 real jurisdictions.

## Method

1. One real API request (`start=2001&end=2025`) returns every real state's
   residential price for every real year at once
   (`scripts/gen_electricity_cost_data.py`).
2. Filter to real state abbreviations only (not aggregate/national rows).
3. Join directly against `data/cities.json`'s own `state` field — no crosswalk.
4. Rescale independently per year: `concern = min(100, price / 41 * 100)`.

## Known limitations (shown, not smoothed over)

- **State-level only**, not city-level — a real, honest gap this dataset shares
  with `income-tax.ts`/`sales-tax.ts`/`property-tax.ts`. Local utility rates can
  vary meaningfully within a state (multiple utilities, municipal vs.
  investor-owned), a real signal this dataset doesn't capture.
- **A single sector (residential)**, not commercial/industrial — the rate that
  actually applies to a household, matching this project's "what a resident
  actually experiences" framing elsewhere (e.g. `income-tax.ts`'s
  applicable-bracket-not-top-marginal-rate choice).

## Reproducing this dataset

```
python3 scripts/gen_electricity_cost_data.py
```

Requires `EIA_API_KEY` in `.env` (get one free at
`eia.gov/opendata/register.php`, or run `scripts/load-secrets-from-gcp.sh` if
you have access to this project's GCP Secret Manager). Caches the raw API
response under `data/raw/electricity-cost-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch). Writes `data/electricity-cost.json`
with all years in `START_YEAR`-`END_YEAR`.
