# Research brief — data-drive-round-8

## NOAA Storm Events Database (real, working, picked)

`ncei.noaa.gov/pub/data/swdi/stormevents/csvfiles/` -- confirmed live, a real,
directly-browsable public data directory (no API, no key), one gzipped CSV per
year. Downloaded and inspected the real 2024 file (`StormEvents_details-
ftp_v1.0_d2024_c20260728.csv.gz`, 69,802 real severe weather events
nationally). Real fields: `STATE_FIPS` + `CZ_FIPS` (county FIPS, when
`CZ_TYPE='C'`), `EVENT_TYPE` (tornado, thunderstorm wind, flood, hail, etc.),
real `DEATHS_DIRECT`/`INJURIES_DIRECT`/`DAMAGE_PROPERTY` fields.

Confirmed the county join directly: `STATE_FIPS=40` + `CZ_FIPS=141` in a real
sample row resolves to `40141` -- Tillman County, OK, correctly matching the
event's own real location text ("FREDERICK ARPT", a real town in Tillman
County). Filtering to `CZ_TYPE='C'` (county-based zones, not NWS forecast
zones or marine zones) gives 39,718 real events across 3,063 real US counties
for 2024 alone (median 9 events/county, max 177).

Reuses the existing `city-county-fips.json` crosswalk directly -- no new
geocoding.

## Other candidates checked briefly, not pursued this round

NCES teacher/staff FTE fields (checked via the same Urban Institute API
`school-spending.ts` already uses) are null for the specific NYC record
checked -- a real, live data-quality concern not investigated further given
NOAA storm events was already a strong, validated find. HUD Fair Market Rents,
CDC WONDER, USDA food price data not attempted this round.

## Pick for this round

**NOAA Storm Events (severe weather event frequency)** -- real, live-verified,
keyless, static bulk file, reuses the existing county crosswalk.
