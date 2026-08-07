# Drought severity — methodology

The thirty-second real Mapstack dataset (ddr3-1, `data-drive-round-3` epic).

## What this measures

One layer, **Drought severity**, 0–100. Raw input is the real `D2` percentage from
the US Drought Monitor's own nested severity classification (`None` < `D0`
Abnormally Dry < `D1` Moderate < `D2` Severe < `D3` Extreme < `D4` Exceptional,
each cumulative) — the percentage of a county's land area currently in Severe
Drought or worse. Already a natively 0–100-bounded real percentage, used directly
with no rescale — higher is more concerning.

## Data source

[US Drought Monitor](https://droughtmonitor.unl.edu/), a joint NOAA/USDA/University
of Nebraska-Lincoln product, via its real public data service
(`usdmdataservices.unl.edu`). Free, no API key.

## Method

The API takes a real 5-digit county FIPS directly as its `aoi` parameter — no
crosswalk needed beyond the existing `data/raw/city-county-fips.json` this repo
already has. State-level and national `aoi` values were tried live during
research and return empty responses (real, confirmed, not assumed) — this is a
genuinely per-county API, one request per unique county in the spine (293 unique
counties across the 512 cities).

For each county, fetches the most recent available week's data (a 14-day lookback
window, since USDM publishes weekly) and takes the `D2` column from the latest
`MapDate` row.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage, but county-level only** — same ceiling as
  `business-density.ts`/`average-wage.ts`; no batchable state/national query was
  found for this API.
- **A real snapshot, not a stable characteristic.** Unlike most datasets in this
  repo (a tax rate, a school district's spending), drought severity is inherently
  volatile week to week — this dataset ships `supportsTime: false` and reflects
  conditions as of whatever week the data was last generated (the `as_of` date is
  shown explicitly in every detail string, never hidden).
- **A single severity threshold (D2), not the full 5-level classification** — a
  future pass could surface the full `D0`-`D4` breakdown as sub-layers, the same
  shape `hazard.ts`'s composite/sub-layer split already uses.

## Reproducing this dataset

```
python3 scripts/gen_drought_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already exist.
Caches each county's response under `data/raw/drought-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch any time, though re-fetching will
naturally pull a more current week's data than whatever's cached).
Writes `data/drought.json`.
