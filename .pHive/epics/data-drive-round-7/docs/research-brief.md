# Research brief — data-drive-round-7

## IMLS Public Libraries Survey (real, working, picked -- resolves a lead deferred twice)

Deferred twice earlier this session (`dataset-verification-drive`'s addendum, and
a quick re-check this round) after a direct URL guess 404'd. Resolved this round
by browsing IMLS's own site structure (not guessing a URL): `imls.gov/research-
evaluation/data` → "Library Search & Compare" → the real survey page
`imls.gov/research-evaluation/surveys/public-libraries-survey-pls`, which links a
real, direct bulk CSV download:
`imls.gov/sites/default/files/2026-06/pls_fy2024_csv.zip` (FY2024, the latest
year, 3.6MB, no API/key needed at all -- a static file, not even a query
endpoint).

**A real join-strategy lesson learned twice this session now**: the file's
`CITY`/`STABR` fields are administrative address fields, not service-area
fields -- the same class of problem that sank this round's earlier drinking-water
attempt. Confirmed live: exact `CITY="MINNEAPOLIS"` + `STABR="MN"` has **zero**
matching rows (real Minneapolis, MN's library system is registered under a
different administrative city name), and 114/512 spine cities have no matching
row at all by name. Fort Worth, TX and Santa Rosa, CA and Hartford, CT DO have a
real matching row by name, but with real IMLS missing-data codes (`-3`) for
`VISITS`/`POPU_LSA` that year -- a genuine reporting gap, not a join failure.

**The real fix, learned from TRI/drought earlier this session**: the file also
carries real `LATITUDE`/`LONGITUD` per library system -- confirmed live, **100%**
of the file's 9,249 rows have valid, non-zero coordinates (9,168 also have valid
`VISITS`/`POPU_LSA`). A radius-based join (same haversine pattern as
`tri-facility-density.ts`) avoids the whole administrative-naming problem
entirely -- every city's own real lat/lon (already in `data/cities.json`) finds
real nearby library systems regardless of what city name their own paperwork
uses.

## Pick for this round

**Library visits per capita** (IMLS Public Libraries Survey) -- real, keyless,
static bulk download, radius-based join (validated far more reliable than the
file's own city-name field), resolves a lead deferred twice this session.
