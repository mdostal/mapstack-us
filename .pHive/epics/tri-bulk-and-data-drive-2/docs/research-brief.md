# Research brief — tri-bulk-and-data-drive-2

## The real EPA TRI blocker, and its real fix (live-verified)

`dataset-verification-drive`'s dvd-6 story tried to build EPA TRI facility density from
the live query API (`data.epa.gov/efservice/tri_facility/...`) and hit a genuine wall: a
single-state bulk query ran 16+ minutes and still returned truncated JSON. That table is
EPA's **entire historical facility registry** (confirmed live: `COUNT` returns 59,208
non-closed facility records, cumulative across all reporting years since 1987) — querying
it in bulk via the interactive query endpoint is not what it's built for.

The real fix, found by reading the TRI Basic Data Files page
(`https://www.epa.gov/toxics-release-inventory-tri-program/tri-basic-data-files-calendar-years-1987-present`)
directly rather than the query API docs: EPA publishes a **separate, purpose-built bulk
download endpoint** for exactly this use case — one pre-built CSV per reporting year,
national or state-scoped. Confirmed live:

```
https://data.epa.gov/efservice/downloads/tri/mv_tri_basic_download/2024_US/csv
```

returned the **complete 2024 national file in ~60 seconds, one request** — 4,411 rows
(one per facility/chemical pair), 3,525 unique facilities after dedup on the `TRIFD`
column, every one with real decimal lat/lon (`LATITUDE`/`LONGITUDE` columns). This is the
**current reporting year's actively-reporting facilities only** (not the cumulative
historical registry the live API queries), which is actually the more defensible framing
for a "current risk" dataset anyway.

Real per-city proximity test (haversine, 10-mile radius, computed against all 20 largest
spine cities in under a second): Houston 18 facilities, Chicago 14, San Francisco 0 —
real, plausible, differentiated numbers.

## Data-drive round 2

The `dataset-verification-drive` epic's addendum already covered a first fresh sweep
(school spending, business density, TRI, IMLS libraries, USDA farmers markets, FCC
broadband). This epic's second story runs a genuinely new round beyond that list, live-
checking sources not yet touched by any prior sweep.
