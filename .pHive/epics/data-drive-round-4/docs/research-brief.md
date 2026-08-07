# Research brief — data-drive-round-4

## FBI hate crime and EPA Superfund: still real dead-ends (third attempt, different angle)
Tried a documentation-first angle this round instead of more endpoint-name guessing:
the FBI CDE's own docs page (`cde.ucr.cjis.gov/.../docApi`) returned a real `200` but
is a JS-rendered SPA, not fetchable via plain curl for its actual API reference
content; `api.usa.gov/crime/fbi/cde/docs` returned a real `403`. EPA's own
"Envirofacts Data Service API" page loaded but a grep for `SEMS`/Superfund table
names in its raw HTML found only the word "sems" in unrelated navigation text, not a
real table listing. Both genuinely deferred a third time — this needs a browser-
rendered session or a different EPA/FBI documentation entry point, not more guessing.

## New candidates checked this round

### HUD Fair Market Rents (deferred -- needs a new key)
`huduser.gov/hudapi/public/fmr/...` returned a real, live `401 Unauthenticated` --
confirmed the API exists and is real, but requires its own free registration token
this project doesn't have yet. Deferred as a real, viable future candidate once a key
is obtained (same posture as BEA/Census/BLS/AirNow earlier this session) -- not
pursued further this round since it needs user action (registration) first.

### DOT/FHWA AADT traffic volume (deferred -- wrong service name)
`geo.dot.gov/server/rest/services/Hosted/AADT_2022/FeatureServer/...` returned a
real `404 Service not found` -- the exact ArcGIS FeatureServer name guessed doesn't
exist. Real, plausible source (FHWA's Highway Performance Monitoring System does
publish AADT data), but the correct service name needs more discovery than this
round had budget for. Deferred, not struck out.

### EPA Safe Drinking Water Act (SDWA) violations (real, working, picked)
Initial table-name guesses (`SDWA_VIOLATION`, `SDWA_PUB_WATER_SYSTEMS`) failed with
"table not available," same pattern as the earlier Superfund attempts -- but this
time two real, correctly-named tables were found: `WATER_SYSTEM` and `VIOLATION`,
both confirmed live with real data.

**Real join design, validated live**: `WATER_SYSTEM` doesn't have a county or
lat/lon field, but it does have `city_name`/`state_code` (freetext, not FIPS) plus
`pws_type_code` (`CWS` = Community Water System, the real municipal-utility type)
and `population_served_count`. Querying by city name + state + `pws_type_code=CWS`
+ `pws_activity_code=A` (active) and taking the highest `population_served_count`
reliably surfaces the real municipal system -- confirmed live for Houston, TX:
"CITY OF HOUSTON" at 2,970,543 population served, correctly the top result by a
huge margin over the next-largest real match (Clear Lake City Water Authority,
89,702). A naive `city_name=HOUSTON` match alone returns 2,748 rows (mostly tiny
unrelated systems like gas-station wells) -- the `pws_type_code`+activity+population
filter is what makes this a real, reliable join.

`VIOLATION` (queried by `pwsid`) has a real `is_health_based_ind` flag and a real
`compl_per_begin_date` -- both directly usable for a "recent health-based violation
count" metric.

## Pick for this round

**SDWA drinking water violations** -- real, live-verified, keyless, a genuinely
different join strategy (name+type+population, not FIPS) from any dataset shipped so
far this session, real public-health signal.
