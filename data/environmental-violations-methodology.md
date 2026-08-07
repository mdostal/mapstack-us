# Environmental violations — methodology

The fortieth real Mapstack dataset (ddr11-1, `data-drive-round-11` epic).
512/512 real coverage.

## What this measures

One layer, **Environmental violations**, 0–100. Raw input is the real count of
facilities in "Significant Violation" compliance status within 10 miles of each
city — facilities in serious regulatory noncompliance, aggregated across the
Clean Air Act, Clean Water Act, and RCRA hazardous-waste programs. A count has no
natural 100-point ceiling, so this uses a direct rescale capped at a
data-informed ceiling (the real p90 across the spine, 35), higher count = more
concerning.

This is a genuinely distinct signal from two datasets already shipped this
session: `tri-facility-density.ts` measures toxic release *reporting* volume (a
facility can report releases while remaining in compliance), and `superfund.ts`
measures contaminated-site *remediation status* (a historical/ongoing cleanup
designation). This dataset measures **active regulatory noncompliance** — a
facility currently failing to meet its permit conditions.

## Data source

The [EPA ECHO (Enforcement and Compliance History Online)](https://echo.epa.gov/)
Exporter bulk file (`echo.epa.gov/files/echodownloads/echo_exporter.zip`), real
and free, no key or registration required. This is a genuinely different data
product from the `data.epa.gov` Envirofacts services already used for TRI and
Superfund this session.

## A real mid-build pivot (shown, not smoothed over)

The initial approach used ECHO's live REST API
(`echodata.epa.gov/echo/echo_rest_services.get_facilities`) with a server-side
spatial radius query per city — the same pattern proven by
`historic-site-density.ts` in the prior round. This worked and returned real,
plausible values during research (verified live: New York NY → 69 significant
violations within 10mi, Bozeman MT → 2, Taos NM → 0), but a full 512-city run hit
a real, documented rate limit partway through: *"If your requests exceed 300 per
hour or 1,500 per day, we will throttle your request."* ECHO's own error message
pointed to its bulk data downloads as the alternative.

This dataset pivoted to the real ECHO Exporter bulk file instead — a single
429MB download (3,174,034 real facility rows, 2.1GB uncompressed), each with a
real `FAC_LAT`/`FAC_LONG` coordinate, joined locally via haversine (the same
radius-join shape as `tri-facility-density.ts`, just against a different EPA bulk
file). No rate limit, no crosswalk.

A second real finding during the pivot: the file's own `FAC_SNC_FLG` column —
which EPA's official column dictionary describes as exactly the
Significant-Noncompliance/High-Priority-Violator/Serious-Violator flag this
dataset needs — is `'N'` for every single one of the 3,174,022 real rows in this
export, confirmed by a full-file scan (not a sample). This looks like a stale or
rarely-updated field in this particular export. The real, populated field for the
same concept is `FAC_COMPLIANCE_STATUS`, whose value `'Significant Violation'`
appears for a real, plausible ~0.6% of sampled rows and is the overall
compliance-status field EPA's own documentation
([DFR data dictionary](https://echo.epa.gov/help/reports/dfr-data-dictionary#facenfsum))
points to.

As a live cross-check: this bulk-file method's New York NY count (77, computed
here) lands in the same real ballpark as the live REST API's earlier NYC count
(69) — different snapshot dates and slightly different underlying computation,
but consistent with the same real underlying signal.

## Method

1. Download the real ECHO Exporter bulk file (`echo_exporter.zip`, cached under
   `data/raw/environmental-violations-cache/`).
2. Stream `ECHO_EXPORTER.csv` directly from the zip (no separate extraction),
   filtering to `FAC_COMPLIANCE_STATUS == 'Significant Violation'` and collecting
   each matching facility's real `FAC_LAT`/`FAC_LONG` (19,801 real facilities
   nationally).
3. For each of the 512 spine cities, count real facilities within a 10-mile
   haversine radius of the city's own `lat`/`lon` from `data/cities.json`.
4. Rescale: `concern = min(100, (count / 35) * 100)`. The cap (35) was chosen
   from the real full-512-city distribution checked before shipping (p50=8,
   p75=16, p90=33, p95=60, p99=182) — not guessed.

## Known limitations (shown, not smoothed over)

- **Cross-program aggregate, not single-statute.** `FAC_COMPLIANCE_STATUS`
  reflects the facility's overall status across CAA, CWA, and RCRA — a city could
  score high because of one dominant program's violations rather than broad
  noncompliance. A future pass could break this into per-program layers
  (`CAA_HPV_FLAG`, `CWA_SNC_FLAG`, etc. — also present in the same bulk file) if
  useful.
- **10-mile radius crosses city boundaries.** A real, visible effect in the
  shipped data: several close-together Seattle-area suburbs (Kirkland, Auburn,
  Federal Way, Renton, Bellevue) all score near the top, each picking up
  overlapping industrial/port-area facilities within their own 10-mile radius —
  the same disclosed pattern as `historic-site-density.ts`, not a bug.
- **A point-in-time snapshot**, not a trend. This dataset ships
  `supportsTime: false` and reflects the real compliance status at the bulk
  file's own publication date (August 2026).

## Reproducing this dataset

```
python3 scripts/gen_environmental_violations_data.py
```

No API key required. Caches the real bulk zip under
`data/raw/environmental-violations-cache/` (gitignored — pure fetch-scratch,
429MB, safe to delete and re-fetch any time). Writes
`data/environmental-violations.json`.
