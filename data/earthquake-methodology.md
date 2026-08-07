# Seismic risk — methodology

The thirty-fifth real Mapstack dataset (ddr6-1, `data-drive-round-6` epic).
512/512 real coverage.

## What this measures

One layer, **Seismic risk**, 0–100. Raw input is the real `sds` value (Design
Spectral Response Acceleration, short period, in units of g) — the same standard
value real building codes use to assign a Seismic Design Category (a real A–F
classification, also shown in the detail string when available). Direct rescale,
capped at 1.5g (the real p95–p99 range across the spine; 16/512 cities exceed it
and clamp to 100), higher = more concerning.

This is a genuinely new hazard category for this project — `hazard.ts`'s existing
FEMA National Risk Index layers cover flood and wildfire risk, not earthquake.

## Data source

[USGS ASCE 7-22 Web Service](https://earthquake.usgs.gov/ws/designmaps/), free,
no API key. Implements the real ASCE 7-22 structural engineering standard
(referenced by U.S. building codes) for a given location.

## Method

Every city in `data/cities.json` already has real lat/lon, so this joins directly
— **no crosswalk needed at all**, unlike almost every other dataset in this repo.
One request per city: `siteClass=D` (stiff soil, the real ASCE 7 default when
site-specific geotechnical data isn't available) and `riskCategory=I` (standard
occupancy). Confirmed live during research: Los Angeles `sds=1.51` (Seismic
Design Category D); San Francisco `sds=1.17` (Category D); New York City
`sds=0.2` (Category B) — matches real-world seismic knowledge.

## Known limitations (shown, not smoothed over)

- **`siteClass=D` is a real, standard default, not every city's actual local
  soil type.** Site-specific geotechnical data would shift the real value for
  any given address — this dataset reports the same standard baseline
  engineering practice uses absent that data, not a site-specific survey.
- **`sds` alone, not the full ASCE 7 response** — the real API also returns
  `sd1` (1-second period), `pgam` (peak ground acceleration), and a full
  multi-period design spectrum; a future pass could surface these as sub-layers.
- **A snapshot of the current USGS hazard model**, not a historical trend —
  `supportsTime: false`. USGS updates its underlying hazard model periodically
  as seismological understanding improves; this reflects whatever model version
  was live at build time.

## Reproducing this dataset

```
python3 scripts/gen_earthquake_data.py
```

No API key required. Caches each city's response under
`data/raw/earthquake-cache/` (gitignored — pure fetch-scratch, safe to delete and
re-fetch any time; retries transient network timeouts with backoff). Writes
`data/earthquake.json`.
