# Traffic safety — methodology

The eleventh real Mapstack dataset: motor-vehicle-crash death rate, joined at **county**
level — reusing the same city→county crosswalk `hazard-methodology.md`'s build already
produced, zero new geocoding needed.

## What this measures

One layer, **Traffic fatality rate**, 0–100. Raw input is County Health Rankings &
Roadmaps' "Motor Vehicle Crash Deaths" measure — a **7-year rolling average (2017–2023)**
of traffic deaths per 100,000 residents, already "higher = more concerning" with no
inversion needed.

## Data source

[County Health Rankings & Roadmaps](https://www.countyhealthrankings.org/), 2025 Annual
Data Release, free direct CSV download — no key, no login. CHR's own underlying source is
the **National Center for Health Statistics Mortality Files + Census Population Estimates
Program, via the National Vital Statistics System (NVSS)** — the same government mortality
system real crash-fatality data ultimately flows through.

**Why CHR and not NHTSA's own FARS API directly**: NHTSA's FARS CrashViewer API
(`crashviewer.nhtsa.dot.gov/CrashAPI`) sits behind the same Akamai edge gateway that
blocked automated requests to `fema.gov`/`hazards.fema.gov` earlier in this project — a
plain `curl` returns a 403 "Access Denied" page, not JSON. CHR republishes the real
underlying mortality-system data as a clean, free, public CSV instead, with the added
benefit of already being population-normalized (no separate crash-record aggregation or
per-county population lookup needed, unlike a raw FARS build would require).

## Method

1. **County crosswalk**: each spine city's county FIPS is read directly from
   `data/raw/city-county-fips.json`, already built by `geocode_city_counties.py` for the
   hazard dataset — no new network calls.
2. **Rate join** (`scripts/gen_traffic_fatalities_data.py`): CHR's national CSV is parsed
   for the `v039_rawvalue` (rate) and `v039_numerator` (raw death count) columns, joined to
   each city's county FIPS.
3. **Small-county fallback**: CHR suppresses (blanks) the county rate when a county had
   **fewer than 10 motor-vehicle deaths across the full 2017–2023 window** — mostly small,
   rural counties where a single-digit count would be statistically unstable to publish.
   For these, the city's **state-level average** (which CHR also ships) is used instead,
   explicitly recorded as `fallback: "state"` in `data/traffic-fatalities.json` — never a
   fabricated county number.
4. **Concern score**: each city's rate is converted to a percentile rank (0–100) among all
   covered cities, computed once at generation time — same convention as
   `crime-methodology.md`/`hazard-methodology.md`.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — every spine city inherits its whole county's 7-year
  average, which genuinely blurs risk for a small town far from its county seat or for a
  city whose own roads are meaningfully safer/more dangerous than its county's rural
  stretches. Same shape as hazard's/SVI's/food-access's own county-or-tract-level caveat.
- **A 7-year rolling average (2017–2023), not an annual snapshot** — CHR's own choice, made
  specifically so small counties have enough deaths in the window to publish a real rate at
  all rather than a single noisy year. This dataset does not offer a year-by-year history
  (`supportsTime: false`) the way crime's genuinely annual FBI data does.
- **Every one of the 512 spine cities' counties had a real, publishable (non-suppressed)
  rate in this build** — the state-level fallback path exists and is exercised by CHR's own
  national data for the smallest US counties generally, but it was not actually needed for
  any spine city this run. Documented as a real fallback path this dataset supports, not a
  claim that it's currently active anywhere.
- **A pre-COVID-inclusive window** — 2017–2023 spans both the COVID-era travel-pattern
  shift (a real, documented national spike in traffic deaths despite less driving) and its
  partial recovery; a single 7-year average smooths over that swing rather than showing it.

## Reproducing this dataset

```
python3 scripts/gen_traffic_fatalities_data.py
```

Requires `data/raw/city-county-fips.json` to already exist (built by
`geocode_city_counties.py` for the hazard dataset). Writes
`data/traffic-fatalities.json`. Caches the raw CHR national CSV under
`data/raw/traffic-cache/` (gitignored — pure fetch-scratch, safe to delete and re-fetch any
time).
