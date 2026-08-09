# Drought severity — methodology

The thirty-second real Mapstack dataset (ddr3-1, `data-drive-round-3` epic), extended
to real multi-year history **2000–2026** this session.

## What this measures

One layer, **Drought severity**, 0–100. Raw input is the real annual AVERAGE of the US
Drought Monitor's own weekly `D2` percentage (`None` < `D0` Abnormally Dry < `D1`
Moderate < `D2` Severe < `D3` Extreme < `D4` Exceptional, each cumulative) — the
percentage of a county's land area in Severe Drought or worse, averaged across every
real week USDM published that calendar year. Already a natively 0–100-bounded real
percentage, used directly with no rescale — higher is more concerning, comparable year
to year with no cap needed.

## Data source

[US Drought Monitor](https://droughtmonitor.unl.edu/), a joint NOAA/USDA/University
of Nebraska-Lincoln product, via its real public data service
(`usdmdataservices.unl.edu`). Free, no API key. Real weekly records begin
**2000-01-04** — the real start of the Drought Monitor program itself, not a
project-side limitation.

## Method

1. The API takes a real 5-digit county FIPS directly as its `aoi` parameter — no
   crosswalk needed beyond the existing `data/raw/city-county-fips.json`. State-level
   and national `aoi` values return empty (confirmed live) — this is genuinely
   per-county, but a real date RANGE returns every real weekly row in ONE response, so
   this fetches each of the spine's 293 unique counties exactly ONCE across the full
   real 2000–2026 range (no per-year fetch loop needed, unlike severe-weather.ts or
   air-quality.ts).
2. Groups each county's real weekly rows by calendar year and averages the `D2` column
   across every real week published that year.
3. **A real, confirmed-live surprise**: USDM's own FIPS-coded boundary layer already
   reflects Connecticut's 2022 county-to-planning-region transition (the same real
   transition already disclosed in `broadband-methodology.md`/`air-quality-
   methodology.md`), and matches consistently across the ENTIRE real 2000–2026
   history — USDM appears to have retroactively recomputed historical CT percentages
   against its current (post-2022) boundary set. Unlike those other two datasets, CT
   cities here join cleanly through the existing FIPS crosswalk with no state-average
   fallback needed.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage, county-level only** — same ceiling as
  `business-density.ts`/`average-wage.ts`; no batchable state/national query was
  found for this API.
- **An annual average, not a single characteristic value** — drought severity is
  inherently volatile week to week; averaging across the year smooths that into one
  representative number rather than picking one arbitrary week, at the cost of
  masking a county that had one severe month buried in an otherwise normal year. The
  real per-year week count is disclosed in each value (`data/drought.json`'s own
  `weeks` field) so a thin-data year is never silently presented as equivalent to a
  full 52-week year.
- **2026 is a real partial year** (through early August as of this build) — its
  average reflects fewer real weeks than a completed year, disclosed via the same
  `weeks` field.
- **A single severity threshold (D2), not the full 5-level classification** — a
  future pass could surface the full `D0`–`D4` breakdown as sub-layers, the same
  shape `hazard.ts`'s composite/sub-layer split already uses.

## Reproducing this dataset

```
python3 scripts/gen_drought_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already exist.
Caches each county's full-history response under `data/raw/drought-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time; resumable on
rerun). Writes `data/drought.json` with every real year 2000–2026.
