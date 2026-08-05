# Extreme heat — methodology

The nineteenth real Mapstack dataset, picked from the project's own
`dataset-backlog.md` (#14, "Extreme heat days") as the strongest keyless candidate
available while the Census-cluster roadmap (population, income, broadband, tax, housing)
stays partly blocked on a missing `CENSUS_API_KEY`. Unlike every Census-cluster item, this
one needs **no API key at all**.

## What this measures

One layer, **Extreme heat days**, 0–100. Raw input is NOAA's own 30-year climate normal:
the average number of days per year with a maximum temperature above 90°F
(`ANN-TMAX-AVGNDS-GRTH090`). Already a meaningful, externally bounded quantity (days per
year), so it's directly rescaled onto 0–100 rather than a percentile rank among just the
512 spine cities — more heat days is more concerning.

## Data source

[NOAA NCEI 1991–2020 U.S. Climate Normals](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals),
fetched live via NOAA's NCEI Data Service API
(`https://www.ncei.noaa.gov/access/services/data/v1`, dataset `normals-annualseasonal`) —
**confirmed free, no API key, no signup, no rate-limit account required**, verified by
direct fetch during this build.

Station inventory: NOAA's live fixed-width station list at
`https://www.ncei.noaa.gov/data/normals-annualseasonal/1991-2020/doc/inventory_30yr.txt`
(15,615 rows). The FTP-era `/pub/data/normals/...` path used by older documentation now
404s — the current path is under `/data/normals-annualseasonal/...`, confirmed live at
build time.

## Method

1. **Station inventory + temperature-value fetch** (`scripts/fetch_heat_stations.py`):
   the raw 15,615-station inventory includes thousands of CoCoRaHS-style precip/snow-only
   volunteer stations (IDs like `US1AZMR0071`) that report no temperature normal at all —
   an early build that matched cities against the full inventory blindly put real cities
   (Phoenix included) next to a precip-only station with no heat-day value. Fixed by
   fetching the real `ANN-TMAX-AVGNDS-GRTH090` value for every inventoried station first
   (one-time, cached under `data/raw/heat-cache/`, gitignored), keeping only the ~6,700
   stations that actually report it, and matching cities only against that real subset.
2. **Nearest-station match**: each of the 512 spine cities is matched to its closest
   temperature-reporting station by great-circle (haversine) distance — no city→station
   crosswalk table exists, unlike crime's agency-ORI matching, so nearest-point is the
   correct method here. Real result: median distance 6.4 km, max 26.8 km, every city
   within a reasonable local match.
3. **Rescale** (`scripts/gen_heat_data.py`): NOAA's API returns the value in *tenths* of a
   day (confirmed by direct inspection — Phoenix Sky Harbor returns raw `"1688"`, i.e.
   168.8 days/year, matching Phoenix's well-known climate). `concern = min(100, days /
   150 × 100)` — the 150-day cap comes from the real observed spine distribution, not an
   arbitrary round number.

## Known limitations (shown, not smoothed over)

- **20 cities clamp to 100 concern** — Yuma AZ (184.7 days/year, the hottest spine city),
  Indio CA, Maricopa AZ, and 17 more Phoenix-metro/Sonoran-desert cities exceed the
  150-day cap. This is an honest "these are the most extreme-heat places in the country"
  read, not a data gap — every one of them has a real, distinct underlying day count, just
  compressed to the same maximum-concern score the same way any capped scale treats its
  most extreme tail.
- **30-year climate normal, not a live yearly reading** — this reflects the 1991–2020
  climatological average, not this year's actual heat days; NOAA republishes a new normals
  period roughly once a decade (next expected ~2031), so `supportsTime: false`, the same
  single-snapshot posture `walkability-methodology.md`/`wildfire`-class datasets in this
  project's backlog carry.
- **Nearest-station, not on-site measurement** — a city's real heat exposure can differ
  from its matched station's, especially for cities with real microclimate variation
  (elevation, urban heat island, coastal proximity) between the city center and the
  station's exact location. Median match distance (6.4 km) is tight; the worst case
  (26.8 km) is still far better than AQI's typical monitor-sparsity problem noted
  elsewhere in this project's dataset research.
- **512/512 real coverage** — every spine city matched a real temperature-reporting
  station, tied with `broadband-methodology.md` for the best coverage of any dataset this
  project ships.
- **A single threshold (90°F), not a heat-index or humidity-adjusted measure** — NOAA's
  normal counts raw dry-bulb max temperature days, not a "feels like" heat index; a humid
  city and an arid city with the same day count can have meaningfully different real heat
  danger, a real conflation worth naming the same way broadband's methodology names
  subscription-vs-availability.

## Reproducing this dataset

```
python3 scripts/fetch_heat_stations.py
python3 scripts/gen_heat_data.py
```

Both scripts require no API key or account. Caches the raw station inventory and every
station's temperature-normal fetch under `data/raw/heat-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch any time) and the final city→station match
table at `data/raw/heat-station-matches.json`. Writes `data/heat.json`.
