# Research brief — data-drive-round-3

## Candidates live-checked this round

### US Drought Monitor (real, working, picked)
`usdmdataservices.unl.edu/api/CountyStatistics/GetDroughtSeverityStatisticsByAreaPercent`
-- confirmed live, no API key, CSV response. Takes a real 5-digit county FIPS directly
as `aoi` (e.g. `aoi=36061`), returns real weekly drought-severity percentages by
nested category (`None`/`D0`/`D1`/`D2`/`D3`/`D4`, each cumulative -- `D2` = % of the
county's area in Severe Drought or worse). ~0.6s per request. State-level and
national `aoi` values (`aoi=36`, `aoi=US`) return empty (200 with zero rows) --
confirmed live, this API is per-county only, no batch option found. Reuses the
existing `city-county-fips.json` crosswalk directly -- no new geocoding.

### FBI hate crime statistics (deferred again, real dead-end this round)
Tried the same `summarized/agency/{ori}/{offense}` shape `crime.ts` already uses
successfully for violent/property crime, with several plausible offense-code
guesses (`hate-crime`, `hate-crimes`, `hatecrime`, `bias`, `bias-motivation`)
against a real ORI. All returned the API's own real error, "The requested offense
is missing or not a valid one" -- meaning the endpoint shape is right but the
correct offense code isn't among the ones guessed. Without API documentation
access this round, genuinely can't find the right code -- deferred again, not
struck out.

### EPA Superfund/NPL sites (deferred again, real dead-end this round)
Tried several more plausible Envirofacts table names beyond dvd-6's addendum
attempt; all returned real "table is not available" errors, same as before.
Envirofacts' own `metadata/tableName` introspection table is itself unavailable.
Deferred, not struck out -- needs the real EPA data dictionary, not further guessing.

## Pick for this round

**US Drought Monitor** -- real, live-verified, keyless, reuses the existing county
crosswalk with zero new geocoding, real ~0.6s/request confirmed against real
counties (LA County, NY County both tested).
