# Industrial facility density — methodology

The thirtieth real Mapstack dataset (tri-1, `tri-bulk-and-data-drive-2` epic).

## What this measures

One layer, **Industrial facility density**, 0–100. Raw input is the real count of EPA
Toxics Release Inventory (TRI) reporting facilities within a 10-mile radius of each
city. Direct rescale, capped at the real 2024 90th-percentile count across the 512-city
spine (66, padded to 70) — higher density is more concerning.

## Data source

[EPA Toxics Release Inventory (TRI)](https://www.epa.gov/toxics-release-inventory-tri-program),
[Basic Data Files](https://www.epa.gov/toxics-release-inventory-tri-program/tri-basic-data-files-calendar-years-1987-present),
2024 reporting year, national file. Free, no API key.

## Method — a real detour worth documenting

A prior attempt at this exact dataset (dvd-6, `dataset-verification-drive` epic) tried
EPA's **live query API** (`data.epa.gov/efservice/tri_facility/...`) and hit a real
wall: a single-state bulk query ran **16+ minutes** and still returned a truncated,
invalid JSON response. That table is EPA's entire **cumulative historical facility
registry** — confirmed live, a plain `COUNT` query returns 59,208 non-closed records
going back to 1987 — genuinely not built for bulk querying, and the earlier attempt
correctly pivoted away rather than forcing it.

This build found the real fix by reading [the TRI Basic Data Files page](https://www.epa.gov/toxics-release-inventory-tri-program/tri-basic-data-files-calendar-years-1987-present)
directly instead of the query API's own docs: EPA publishes a **separate,
purpose-built bulk download** — one pre-built CSV per reporting year — at:

```
https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/2024_US/csv
```

Confirmed live: the **complete national file** in one request, ~60 seconds,
**21,482 unique facilities** after deduping on the `TRIFD` column (one row per
facility/chemical pair in the raw file) — a completely different, fast access path
from the one that blocked the earlier attempt. This is also the **current reporting
year's actively-reporting facilities only**, not the cumulative historical registry —
arguably the more defensible "current risk" framing anyway.

1. Fetch and cache the real national CSV (`data/raw/tri-cache/`).
2. Dedup to unique facilities by `TRIFD`, keeping each facility's real
   `LATITUDE`/`LONGITUDE`.
3. For each of the 512 spine cities (already has real lat/lon in
   `data/cities.json` — **no crosswalk needed at all**), count real facilities
   within a 10-mile haversine radius.
4. Direct rescale, capped at 70 (the real p90 across the spine, 66, with a small pad).

## Known limitations (shown, not smoothed over)

- **512/512 real coverage**, since this joins by geographic proximity rather than a
  FIPS crosswalk that could have real gaps.
- **A single reporting year (2024)**, not a historical trend — TRI data is annual;
  this dataset doesn't ship `supportsTime: true` yet.
- **Facility count, not release volume or chemical toxicity** — a real, deliberate
  simplification. TRI's own data includes real release-quantity and chemical-hazard
  fields (carcinogen/PBT/PFAS flags) that a future pass could weight by, rather than
  treating every reporting facility equally.
- **10-mile radius is a chosen constant**, not derived from any exposure-science
  standard — named and documented (`RADIUS_MILES` in the generation script), same
  posture as `air-quality.ts`'s own `DISTANCE_MILES = 50` constant.

## Reproducing this dataset

```
python3 scripts/gen_tri_facility_density_data.py
```

No API key required. Caches the raw national CSV under `data/raw/tri-cache/`
(gitignored — pure fetch-scratch, safe to delete and re-fetch any time). Writes
`data/tri-facility-density.json`.
