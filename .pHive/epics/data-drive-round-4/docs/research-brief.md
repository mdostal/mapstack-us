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

## UPDATE (post-planning, real live build attempt)

**SDWA drinking water violations turned out structurally infeasible.** Live-testing
the join design against New York City -- the single most scrutinized case -- found a
serious problem the original validation (Houston) didn't surface: `WATER_SYSTEM`'s
`city_name` field is the system's *administrative/mailing* address, not its real
service area. NYC's real water system ("NEW YORK CITY SYSTEM", 8,271,000 served,
confirmed via a state-wide query) is registered under `city_name=VALHALLA` (its
Westchester County watershed office) -- querying `city_name=NEW YORK` returns 20
unrelated small systems (mobile home parks, none over 655 served), so the "highest
population match" heuristic would have silently mislabeled NYC's real drinking-water
record with a random trailer park's. `GEOGRAPHIC_AREA.city_served` (the field that
might have fixed this) is sparse/null for real records tried. No lat/lon or county
field exists anywhere in this data model either. Genuinely abandoned, not shipped --
this is exactly the kind of thing this project's "verify before reporting" standard
exists to catch.

**Pivoted to FBI hate crime statistics instead** -- resolving a lead deferred across
three prior research rounds. The blocker was never the offense code (`hate-crime`,
`bias`, etc. were always wrong guesses) -- it's a real, separate resource tree with
its own `{bias}` path parameter, not an `{offense}` value on the existing
`summarized/agency` endpoint. Found by rendering the FBI CDE's own JS-based API docs
page (`cde.ucr.cjis.gov/LATEST/webapp/#/pages/docApi`) via Playwright -- unreadable
via plain `curl` (confirmed, that's why 3 rounds of guessing failed), but real and
complete once rendered. Real endpoint: `GET /hate-crime/agency/{ori}/{bias}`, with
`bias=all` a valid enum value (confirmed via the docs page's own Enum Info panel).
Confirmed live against NYC's real ORI: 624 real hate crime incidents in 2023 --
plausible for the nation's largest, highest-reporting department. Reuses
`data/raw/crime-agency-matches.json` (509 real city→ORI mappings, already built for
`crime.ts`) and that same build's cached per-agency population data -- zero new
crosswalk work needed.

## Pick for this round

**FBI hate crime statistics** -- real, live-verified, resolves a three-round-deferred
lead, reuses `crime.ts`'s existing ORI crosswalk and population cache entirely.
