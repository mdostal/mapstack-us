# Real measured pollen data — feasibility research

Answers known-issues-backlog item #1 (`.pHive/epics/power-user-tab/docs/known-issues-backlog.md`):
does a real, city-level, free (or feasibly-licensable) pollen **count** data source exist, as an
alternative to the current modeled grass-severity score in `data/allergy-scoring.md`? Research
only — no code or data changed. Conducted 2026-08-03 with live web lookups, not training-data
recall.

## Verdict, up front

**No.** No source exists that is simultaneously (a) real measured station/sensor data, (b) free,
(c) bulk/programmatic, and (d) usable at anything close to Mapstack's city-spine scale. Every
candidate fails at least one of those four. The closest real thing — NAB — is real, but is
neither free-to-use-here nor bulk nor broad-coverage; everything that *is* free and bulk (Google,
Ambee, pollen.com/IQVIA) turns out to be a **modeled forecast**, not a measured count, once you
read past the marketing copy. This matches the project's existing posture: a disclosed gap beats
a fabricated number, and this is a disclosed gap. Recommendation at the bottom.

## 1. NAB (National Allergy Bureau) — real stations exist, access does not scale to this project

The NAB, run by AAAAI, is the actual real thing: certified stations run manual optical pollen/mold
spore counts (Rotorod- or Burkard-style samplers, human-read slides), broken out by category
(trees, grasses, weeds, mold) — genuinely grass-specific, not a blended index.

**Station count and coverage** — pulled directly from AAAAI's own official data-request reference
document (`https://allergist.aaaai.org/forms/NABDataReleaseInformation.pdf`, fetched
2026-08-03; the live request form lives at `https://www.aaaai.org/global/nab-pollen-counts`,
which returned no readable station list via automated fetch — the PDF, meant as prep material for
the request form, was the only place a full, current station roster with active/inactive status
was actually obtainable):

- **131 total historical US/PR station entries** listed, of which **71 are currently marked
  active** (`*`). A further handful of active stations exist in Canada, Argentina, and China —
  irrelevant to Mapstack's US spine.
- Deduplicated to unique **metro locations**, that's **~64 US/PR metros** with at least one active
  station (some metros have 2-3 stations under different clinics, e.g. Oklahoma City has 3, Waco
  has 2).
- Cross-checked those 64 metro names directly against `data/cities.json` (512 cities as of this
  research — already grown well past the "168" the other methodology docs still describe; this
  doc does not touch that file). **48 of the 64 NAB-active metro names matched a spine city by
  exact city+state name.** The other 16 are suburbs/small cities not on the spine at all
  (Pleasanton CA, Owings Mills MD, Silver Spring MD, Mount Laurel/Springfield NJ, Armonk/Olean NY,
  Findlay OH, York PA, Caguas/San Juan PR, Greenville SC, La Crosse WI, Coeur d'Alene/Twin Falls
  ID) — so even that 48 is generous; it doesn't confirm the station is the metro's canonical
  representative point, just that the names line up.
- **48 of 512 spine cities (~9%) sit in a metro with an active NAB station.** For the other ~91%,
  there is no NAB coverage at all, active or historical. This is real, sparse, self-selected
  coverage (clinics and research hospitals that chose to run a station), not a designed national
  grid — it clusters around private allergy practices, so it's dense in some metros (TX has 7,
  WI has 3) and has zero presence across huge swaths of the spine (most of the Mountain West
  outside Boise/Missoula/Colorado Springs, most of the upper Midwest outside Minneapolis/Madison,
  almost none of New England beyond one CT station).

**Access — the real disqualifier.** Per the same document:
- Data is **not** a public bulk download or API. It's excel-format historical data (2003–present)
  released only through a **formal per-station request process**.
- Requesters must submit PI name/institution, a 150-word research abstract, a CV, and a letter of
  institutional approval — this is built for academic research groups, not an open-source side
  project.
- **"As a 501(c)(3) organization, the AAAAI chooses not to release data for commercial or
  for-profit use."** Mapstack itself is open-source/non-commercial, but the bar for what counts
  as acceptable "use" in the request is set by AAAAI's own board on a case-by-case basis, and each
  individual station can independently deny the request even after AAAAI approves it.
- **Turnaround is explicitly "up to 12 weeks,"** and even a fully-approved request only releases
  data from stations that individually opt in — there is no guarantee of getting all, or even
  most, of the requested stations back.
- Bottom line: NAB is the one source that's genuinely *measured*, but it's a slow, manual,
  research-gated, per-station-opt-in pathway that returns Excel files for ~9% of the spine at
  best — not something a live web app can wire up as a data source, free or not.

## 2. IQVIA / pollen.com — no public API, and what exists is a forecast, not a count

- **No official public API.** The only programmatic access is `pyiqvia`
  (`https://github.com/bachya/pyiqvia`), an unofficial, reverse-engineered Python wrapper around
  pollen.com's undocumented internal endpoints — no authentication, no published terms, no rate
  limits documented anywhere, meaning it could break or get blocked without notice. Not something
  to build a dataset methodology on with the same rigor as the FBI Crime Data Explorer API used
  for `crime-methodology.md`.
- **More importantly: pollen.com's numbers are a forecast, not a measured count.** Per IQVIA's own
  public FAQ, the Pollen.com "Allergy Forecast" starts from IQVIA's historical database of past
  station counts, then applies a predictive model (seasonal-timing + weather-variable regression)
  to produce a daily by-ZIP-code severity value, explicitly analogized to "how a local
  meteorologist creates a weather forecast." IQVIA's own FAQ flags the same failure mode this
  project's grass model already discloses: unpredictable pollination "booms" and unrepresentative
  sampler placement both distort the underlying real counts the forecast is built from. Even if
  `pyiqvia` were a stable, licensable API, it would not satisfy "real measured pollen data" — it's
  a proprietary model layered on top of some of the same NAB-style station history, one step
  further from the raw count than what this project already has.

## 3. Government sources — no operational federal pollen monitoring exists

- **NOAA**: no official, operational federal pollen product. NOAA's Global Systems Laboratory +
  CIRES have an **experimental** pollen *forecast* model (not a measurement network) — same
  model-not-measurement issue as IQVIA and Google below.
- **EPA AirNow**: confirmed, as the task suspected, this is air-quality only. AirNow's own "About
  the Data" page (`https://www.airnow.gov/about-the-data/`) states its maps and AQI use **only
  ozone, PM10, and PM2.5** — no pollen, now or historically. Do not conflate AirNow with a pollen
  source; it isn't one.
- **CDC**: the Consortium of State and Territorial Epidemiologists (CSTE) has called for a
  coordinated national pollen-monitoring system, and CDC/EPA have endorsed that call — but this is
  a stated *need*, not an existing program. No CDC-operated pollen data exists today.
- **NADP (National Atmospheric Deposition Program)**: the one real federal-adjacent measured
  dataset found, via `data.gov`
  (`https://catalog.data.gov/dataset/national-atmospheric-deposition-program-pollen-study-data-for-2021-pollen-season`).
  Real, free, public, DOI-archived. But it's a **single-season pilot study (2021 only)** across
  **three to four sites** (Madison WI, Logan UT, Draper UT, Duke Forest NC) comparing
  high-volume-air-sampler microscopy against PollenSense optical sensors and NAB summaries — a
  methods-validation study, not an ongoing monitoring program. Not usable at city-spine scale by
  a wide margin (3-4 points vs. 512 cities), and no evidence it continued past that one season.

## 4. University / research networks — real and free, but not pollen counts

- **USA National Phenology Network (USA-NPN)**, `https://www.usanpn.org/data/observational`: a
  real, free, bulk-downloadable, volunteer-contributed database (Nature's Notebook, 2009–present).
  Genuinely useful academically — there's published research (*Aerobiologia*, 2022,
  `https://link.springer.com/article/10.1007/s10453-022-09774-3`) showing USA-NPN's *flowering
  phenology* observations can be used to **model** airborne pollen timing. But that's the tell:
  USA-NPN records when plants bloom, not how much pollen is in the air — it's an input to a
  pollen *model*, structurally the same category as the climate-load research papers
  (`allergy-scoring.md`'s Anderegg 2021 / Zhang & Steiner 2022) already underlying Mapstack's
  current score, not a new source of measured counts.
- No other individual university aerobiology lab was found publishing a free, bulk, multi-city
  current dataset — most university stations that do run counters (Duke, Univ. of Kentucky, Univ.
  of Montana, Univ. of Nevada Las Vegas, etc.) are themselves NAB-affiliated stations, already
  covered in §1, and gated the same way.

## 5. Commercial paid APIs (for completeness — none are free/measured either)

Checked since they surfaced repeatedly in search results as "pollen APIs," to be explicit that
none of them clear the bar either:

- **Google Pollen API** — real product, but explicitly a **model**: a 1×1 km grid computed from
  land cover, climate, and per-species pollen production, only *validated against* station
  measurements where available, not composed of them. Free tier is 5,000 calls/month; paid tier is
  $10 per 1,000 calls. Not free at any meaningful city-spine scale, and not measured data.
- **Ambee Pollen API** — "based on NAB guidelines," which on inspection means calibrated against
  NAB's published risk-level thresholds, not built from live NAB station feeds — another model.
  Free tier: 100 calls/day. Paid tiers are custom-quoted, not published.
- **PollenSense** — the one commercial option that's genuinely **measured**, not modeled:
  physical APS400 optical sensors with AI-based particle classification, real-time. But it's a
  paid sensor-leasing network ($300/sensor/month as of the last published price, 2021, likely
  stale) hosted opportunistically by allergists/municipalities/universities — no published current
  station count or US map of coverage was found, and no free tier exists. Given the NAB
  comparison above (71 active stations only reaching ~9% of the spine), a sparser, unpriced,
  paid-only sensor network is not a viable free alternative.

## Recommendation

Stay with the current modeled approach in `data/allergy-scoring.md` — no better real, free,
bulk, city-level source exists, and this research should be treated as confirming that gap, not
failing to find one. Concretely:

1. **Document the gap prominently**, not just in a methodology doc few users will open: the
   existing "Honest limitations" section already says the model is "directional, not precise" and
   anchored to personal ground truth, but doesn't currently say in one plain sentence that this is
   a **modeled estimate, not a measured pollen count**, and that no free measured source exists at
   city scale — worth surfacing that sentence somewhere more visible in the product itself (e.g.
   the map's detail panel / methodology link), matching how crime's percentile caveat and
   care-access's haversine caveat are both surfaced in-product, not just in the doc.
2. **NAB remains a real, live option if this project is ever willing to pursue it as an actual
   research relationship** — not a code task, an institutional one: an approved requester could
   pull Excel data (2003–present) for the ~48 spine cities with an active station, providing real
   grass-count corroboration for those specific cities' scores (a partial "spot-check" overlay,
   not a full replacement for the other ~91%). Given the 12-week turnaround and non-commercial
   licensing terms, this is a "someday, deliberately" path, not a near-term one.
3. **If a paid budget ever becomes acceptable for this project**, PollenSense is the only
   candidate offering genuinely measured (not modeled) data programmatically — but its coverage
   and current pricing would need direct vendor contact to evaluate; nothing public confirms it
   would beat NAB's ~9% spine coverage.
