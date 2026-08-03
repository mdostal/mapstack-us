# Natural hazard risk — methodology

The fifth real Mapstack dataset: FEMA's own composite natural-disaster risk score, plus
individual flood and wildfire sub-scores, joined from **county** level (not city level) to
every spine city.

## What this measures

Four separate layers, all 0–100, higher = more concerning:

- **Overall risk (all hazards)** — FEMA's National Risk Index composite score, blending
  18 real natural hazards (earthquake, tornado, hurricane, hail, drought, wildfire,
  flooding, and more) using FEMA's own published methodology.
- **Inland flooding** and **Coastal flooding** — kept SEPARATE, not blended into one flood
  number or into the composite score above and beyond what FEMA's own composite already
  includes — same "don't invent a weighting" principle `crime.ts` uses for violent vs.
  property crime. Coastal flooding is honestly `null` (not zero) for landlocked counties —
  FEMA itself marks these "Not Applicable", not "no risk", and this dataset preserves that
  distinction rather than silently zeroing it out.
- **Wildfire** — FEMA's own wildfire hazard sub-score (concentrated in the West/Mountain
  spine, near-zero for most Eastern/coastal cities — real, not a data gap).

These are FEMA's own already-computed 0–100 Risk Index scores, not a percentile Mapstack
computes itself (unlike crime's percentile-among-covered-cities convention) — no
re-normalization needed, since FEMA's methodology already produces a comparable,
higher-is-worse index nationwide.

## Data source

[FEMA National Risk Index (NRI)](https://hazards.fema.gov/nri/data-resources), December
2025 release (v1.20). U.S. government data — public domain, free to use and redistribute.
Fetched from FEMA's own free, keyless ArcGIS FeatureServer
(`services.arcgis.com/XG15cJAlne2vxtgt/.../National_Risk_Index_Counties/FeatureServer/0`)
rather than the `hazards.fema.gov`/`fema.gov` download pages directly — those pages sit
behind Akamai/Cloudflare bot protection that 403s automated `curl` requests; the
FeatureServer is the same underlying data (FEMA's own ArcGIS Hub item
`39485e8035d446a5bff03259508ae355`), served without that gate.

## Method

1. **County crosswalk** (`scripts/geocode_city_counties.py`): each spine city's already-
   known lat/lon (`data/cities.json`) is resolved to its real county FIPS code via the
   Census Bureau's free, keyless Geocoder API
   (`geocoding.geo.census.gov/geocoder/geographies/coordinates`) — a different, keyless
   service from the Census *statistical data* API (`api.census.gov`, which needs
   `CENSUS_API_KEY` and is unrelated to this dataset).
2. **NRI fetch** (`scripts/gen_hazard_data.py`): all ~3,232 US counties' NRI scores are
   fetched in two paginated queries, cached to `data/raw/nri-counties.json`, then joined
   to each spine city via the county FIPS from step 1.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — the single biggest caveat of this dataset. Every
  city in a county inherits that county's ONE score, which real blurs risk for a small
  town far from its county seat (the same "one number for a whole jurisdiction" shape as
  crime's "one agency, one number" caveat). A large, geographically diverse county (e.g.
  one spanning both a floodplain and a highland area) reports a single blended number,
  not a per-neighborhood breakdown.
- **Static snapshot, not time-varying** (`supportsTime: false`) — FEMA republishes NRI
  periodically (this is the December 2025 v1.20 release), not on a fixed annual cadence
  Mapstack could track like crime's year-by-year history. A future re-run against a newer
  FEMA release is a real option, not built here.
- **A composite score can't distinguish hazard TYPE** — a hurricane-driven coastal risk
  and a tornado-driven plains risk can land at the same "Overall risk" percentile despite
  being completely different threats in practice. This is why the flood and wildfire
  sub-scores are shipped as their own separate layers rather than only the composite.
- **Coastal flooding is `null`, not zero, for landlocked counties** — FEMA's own "Not
  Applicable" rating is preserved as an honest gap, never converted to a fabricated
  low-risk value.

## Reproducing this dataset

```
python3 scripts/geocode_city_counties.py  # writes data/raw/city-county-fips.json
python3 scripts/gen_hazard_data.py        # writes data/hazard.json
```

Both scripts cache raw API responses under `data/raw/geocode-cache/` and
`data/raw/nri-counties.json` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time). Re-run either any time the spine grows or FEMA republishes NRI.
