# Transit access — methodology

The twelfth real Mapstack dataset: public transit service level, joined at **Census Urban
Area** level — a real, ID-matched geography, not a name-matched one.

## What this measures

One layer, **Transit service level**, 0–100. Raw input is real vehicle-revenue-miles
(VRM) — the distance transit vehicles actually travel in revenue service, summed across
every mode (bus, rail, vanpool, demand-response) and every agency reporting service in a
city's urban area — normalized by that urban area's population. **Lower** VRM per resident
is **more** concerning (less real transit service relative to population), inverted via
percentile rank among covered cities, same convention `housing-inventory-methodology.md`/
`days-on-market-methodology.md` already use.

## Data source

[FTA National Transit Database (NTD)](https://www.transit.dot.gov/ntd), 2024 Annual Data,
"Metrics (by Agency)" table — free, keyless, fetched from its Socrata mirror on
`data.transportation.gov` (resource `ekg5-frzt`). U.S. government data — public domain.

## Method

1. **Urban Area crosswalk** (`scripts/geocode_city_urban_areas.py`): each spine city's
   real Census Urban Area is resolved by querying Census's own authoritative TIGERweb
   "2020 Urban Areas" layer (`TIGERweb/Urban/MapServer/8`, free, keyless ArcGIS
   FeatureServer) directly at the city's stored coordinate, with a 3km search buffer —
   a deliberate, named tolerance for `data/cities.json`'s own 2-decimal-place lat/lon
   precision (confirmed real: Santa Monica CA's stored coordinate finds no Urban Area at
   0km but correctly finds "Los Angeles--Long Beach--Anaheim, CA" at 3km). A handful of
   Sun Belt suburbs with especially sprawling urban-area boundaries (Norman OK, Goodyear
   AZ, Avondale AZ) needed a second pass at 10km to resolve correctly.
2. **Why an ID join, not a name match**: an earlier approach tried matching NTD's own
   free-text `uza_name` field (e.g. "Nashville-Davidson, TN", "Louisville/Jefferson
   County, KY--IN") directly against spine city names — tested and confirmed to reach only
   ~52% of the spine, AND to silently misclassify real suburbs (Irvine CA, genuinely part
   of the LA urbanized area, whose name never appears in "Los Angeles--Long Beach--Anaheim,
   CA") as having no transit data at all. That conflation — a real suburb with real transit
   reading identically to a genuinely rural town with none — is exactly the kind of
   smoothing-over this project's principles reject, so this dataset uses NTD's own
   `uace_code` field (a stable numeric Urban Area ID) matched against the SAME ID the
   crosswalk above resolves, an exact join instead of a guess.
3. **VRM aggregation** (`scripts/gen_transit_access_data.py`): every NTD row (one per
   agency × mode × year) is summed by Urban Area code, then divided by that Urban Area's
   own reported population.
4. **Concern score**: percentile rank (0–100) among covered cities, inverted (lower
   service = higher concern), computed once at generation time.

## Known limitations (shown, not smoothed over)

- **Urban-Area-level, not city-level** — every spine city inherits its whole urban area's
  aggregate service level, the same real "one number, blurred geography" caveat
  hazard's/SVI's county-or-tract-level datasets already carry, here at urban-area scale.
- **5 cities have no delineated Census Urban Area at all**, even with a 10km search buffer
  — Blanding UT, Monticello UT, Whitewright TX, Sundance WY, Geraldine MT — the same small,
  rural reference towns that show real, honest gaps in several other datasets this project
  ships (crime's unmatched agencies, hazard's unmatched counties). Genuinely too small/rural
  to have one, not a fetch failure.
- **A real NTD reporting quirk**: an agency reports its ENTIRE service under ONE primary
  urban area, even when it actually serves several. Confirmed directly: Utah Transit
  Authority genuinely serves Provo, Orem, Ogden, and Layton, but NTD attributes all of UTA's
  service to the Salt Lake City urban area alone — so those 4 cities (among 27 total similar
  cases) show no data here despite having real transit service, a limitation of NTD's own
  reporting structure, not this project's join. Named explicitly rather than hidden.
- **A handful of Urban Areas genuinely have no FTA-funded reporting agency at all** — small
  and mid-size urban areas without a formal transit system, a real, separate gap from the
  regional-agency-misattribution case above (both fall into the same "no data" bucket in
  `data/transit-access.json`, since a public dataset can't reliably distinguish "genuinely no
  service" from "service exists but reports elsewhere" without agency-by-agency manual
  research — both are honestly null, not fabricated).
- **VRM is a service-supply metric, not a ridership or accessibility metric** — a transit
  system running lots of near-empty vehicle-miles scores well here even if actual coverage
  or frequency where people live is poor. A real, named proxy limitation, same shape as
  hazard's composite-vs-single-hazard caveat.
- **Static single-year snapshot** (`supportsTime: false`) — NTD publishes annual data back
  decades; only the latest full report year (2024) is surfaced here.

## Reproducing this dataset

```
python3 scripts/geocode_city_urban_areas.py   # writes data/raw/city-urban-area.json
python3 scripts/gen_transit_access_data.py    # writes data/transit-access.json
```

Caches raw responses under `data/raw/urban-area-geocode-cache/` and
`data/raw/transit-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch any
time). `data/raw/city-urban-area.json` IS committed (small derived crosswalk, same posture
as `data/raw/city-county-fips.json`).
