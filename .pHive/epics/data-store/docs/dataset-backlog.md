# Dataset Backlog: Candidate New Layers

Research pass, **not** an implementation plan — no code, no scripts, no `Dataset` wrappers
were written for this doc. Goal: survey realistic candidate datasets across every category
the operator asked about (environment/climate, safety, economy, health, infrastructure,
education, civic, demographics, quality of life), verify each one against a **real,
currently-live, free** public source (web-searched 2026-08-02, not assumed from training
data — data.gov URLs and vendor pricing pages change), and rank them so the next dataset
after care-access is an informed pick, not a guess.

**Method:** three parallel research passes (environment/safety, economy/infrastructure,
health/education/civic/quality-of-life), each required to find a specific
agency/API/dataset name + URL, confirm free-key-or-no-key access, and report the actual
reporting geography before a candidate counted as "found." Two categories came back empty
at usable granularity and are excluded per the task's own instructions — see
[Struck out](#struck-out-no-usable-free-source-found) below, rather than force-fitting a
weak source.

**Reading this doc:** every candidate below is scored against the same six fields the task
specified — name, real source, raw direction + normalization, city-level feasibility,
effort vs. crime as the benchmark, and known caveats — in that order, every time, so the
list is scannable and comparable across categories.

## Effort scale, calibrated against `crime.ts`

The crime dataset (`src/lib/datasets/crime.ts`, `data/crime-methodology.md`) is the
existing bar: two Python scripts (agency matching against the FBI's own directory, then
rate computation from raw monthly counts), a free self-serve API key, real multi-year
history (2020–2024), and a genuine method decision (percentile rank, not absolute rate) —
plus honestly naming which of the 168 cities have no data and why. That's **Medium** on
the scale below.

- **Small** — a single free source that already reports at (or very near) city/place
  level, one fetch-and-join script, no real design judgment call beyond picking a
  normalization curve. Less work than crime.
- **Medium** — crime.ts's own shape: a real matching/crosswalk step (agency, tract,
  station, or community boundary), a genuine method decision, and/or combining two
  sources. Comparable effort to crime.
- **Large** — needs GIS/geometry work (raster sampling, polygon aggregation, shapefile
  crosswalks), combines 3+ sources, or has an unresolved product-level design question
  (not just an engineering one) before implementation can start. More work than crime.

## Ranking rationale

The list below is ordered by (value × feasibility) ÷ effort, cheapest and most broadly
useful first, with two deliberate exceptions worth calling out up front. First, several
Census Bureau sources (population, income, broadband) share one API, one free key, and one
crosswalk-free join (`cities.json`'s `city`/`state` already matches Census place names) —
so they cluster at the very top not just because each is individually easy, but because
building the first one pays down most of the cost of the next two. Second, **political
lean is ranked near the bottom despite being the operator's explicitly stated ambition**:
the data itself (MIT Election Lab county returns) is real, free, and easy to fetch, but
unlike every other candidate here it has no politically-neutral "higher = more concerning"
direction, and the fix (reframe as electoral competitiveness/one-party dominance rather
than left/right lean) is a product decision, not a data-engineering one — see its entry
below. It's real and buildable, just not the same kind of "small, obvious win" as the
Census cluster, so it's sequenced after the layers that are unambiguously easy.

---

## Ranked backlog

### 1. Population growth/decline
**Measures:** year-over-year % change in city population — is this place growing or
emptying out.

**Real source:** [U.S. Census Bureau Population Estimates Program (PEP)](https://www.census.gov/programs-surveys/popest.html),
via the free Census API (`api.census.gov/data/{year}/pep/population`). Free self-serve key
at [api.census.gov/data/key_signup.html](https://api.census.gov/data/key_signup.html) —
same key every Census-sourced candidate below reuses.

**Raw direction / normalization:** PEP reports raw population per year per place — higher
population isn't inherently concerning, so the actual metric is the **rate of decline**
(negative multi-year % change), inverted so a shrinking city scores high concern. Growth
isn't automatically "good" either (rapid growth strains housing/infrastructure — a real
tension this project shouldn't paper over), but per the task's framing, decline is the
initial concerning pole; a future note could revisit whether extreme growth deserves its
own separate flag rather than a 0 score.

**City-level feasibility:** the cleanest of every candidate researched — PEP covers **all**
incorporated places and towns annually, with no population floor, unlike ACS (see #2/#3).
Sundance WY, Monticello UT, Geraldine MT, Whitewright TX (the spine's 4 sub-3,000-population
towns) all get a real annual estimate. Direct join on city/state name, no crosswalk needed.

**Effort vs. crime:** Small. One Census API pull per year, one join, one % change
calculation. No agency matching, no percentile method decision.

**Known caveats:** PEP estimates are revised each vintage (methodology quirks like
group-quarters reclassification can produce small artifacts, especially for tiny towns);
year-over-year swings for the smallest spine towns will look noisier than for New York or
LA purely from small-denominator statistics, not a real trend — worth a footnote, same
honesty standard as crime's small-agency caveats.

---

### 2. Median household income
**Measures:** how a city's typical household income compares nationally — a real,
widely-understood economic-hardship proxy.

**Real source:** [Census American Community Survey (ACS)](https://www.census.gov/programs-surveys/acs/data/data-via-api.html)
5-year estimates, variable `B19013_001E`, same free Census API key as #1.

**Raw direction / normalization:** lower income is more concerning — invert. Use the
5-year ACS (not 1-year) for every city: ACS only publishes 1-year estimates for places
with population ≥65,000, which excludes most of the spine's small towns, so 5-year is the
only estimate that actually covers all 168 cities consistently.

**City-level feasibility:** real place-level ACS data exists for effectively every city in
the spine via 5-year estimates. The catch: ACS reports a margin of error (MOE) alongside
every estimate, and for the smallest towns that MOE can be wide relative to the point
estimate — a real precision gap that should be shown, not hidden, the same way crime shows
percentile coverage explicitly.

**Effort vs. crime:** Small–Medium. Straightforward Census API pull once #1's plumbing
exists; the added judgment call is choosing a normalization curve (percentile among
covered cities, like crime, vs. absolute distance from national median) and deciding
whether/how to surface MOE in the detail string.

**Known caveats:** 5-year estimates are a rolling average, not a single-year snapshot — a
city's real current income could differ from the reported 5-year figure, especially after
a fast local economic shift. MOE for towns under ~5,000 population can be large enough that
year-over-year comparisons would be misleading without showing the interval.

---

### 3. Broadband access
**Measures:** the share of households with a home internet subscription — a real
infrastructure-equity gap, not just an urban/rural cliché.

**Real source:** Census ACS table `S2801`/`B28002` (internet subscription), same free
Census API/key as #1–#2. FCC's [National Broadband Map](https://broadbandmap.fcc.gov) is a
real alternative/supplement (address-level "is broadband available here" rather than
"do people actually subscribe") but requires its own separate free FCC account/token and
heavier aggregation from location-level records up to city — a materially bigger lift for
a secondary signal, not the primary source.

**Raw direction / normalization:** lower subscription % is more concerning — invert
directly onto 0–100.

**City-level feasibility:** same place-level, 5-year-ACS coverage as #2, same MOE caveat
for small towns. Effectively free to add once the Census API pipeline for #1/#2 exists.

**Effort vs. crime:** Small. Nearly identical script to #2 — different ACS table, same
join, same key.

**Known caveats:** ACS measures *subscription* (a household choice/affordability question),
not *availability* (an infrastructure question) — a household with broadband available but
priced out looks identical here to one with no service at all, a real conflation worth
naming explicitly, the same way crime names the difference between "no crime" and "no
reporting."

---

### 4. Housing affordability
**Measures:** how far a typical local income stretches against local home prices — the
single most-requested "is this place livable for me" question this kind of tool tends to
get asked.

**Real source:** [Zillow Home Value Index (ZHVI)](https://www.zillow.com/research/data/) —
free CSV download, no login, updated monthly, reported at **city level directly** (also
ZIP/county/metro/neighborhood). Paired with Census ACS median household income (#2) to
compute a price-to-income ratio.

**Raw direction / normalization:** higher price-to-income ratio is more concerning.
Normalize either via percentile rank among covered cities (crime's approach) or against a
known affordability benchmark (e.g., the standard "3x income" starter-affordability rule of
thumb) — the latter risks implying more precision than a single ratio supports, so
percentile rank is the more defensible default, consistent with crime's own reasoning for
choosing percentile over an invented absolute scale.

**City-level feasibility:** genuinely good — ZHVI is one of the only real estate sources
that reports at true city granularity, not just metro. The real gap: ZHVI suppresses or
thins out data for very-low-transaction-volume markets, which is exactly the profile of the
spine's smallest towns — some may have sparse or missing history.

**Effort vs. crime:** Medium. Combines two sources (Zillow + Census income), needs a
documented ratio-construction decision, and needs a documented handling for ZHVI's
per-city suppression gaps — comparable complexity to crime's agency-matching step.

**Known caveats:** ZHVI is a modeled "typical home value," not a transaction-price median —
Zillow's own methodology note this; small towns with too few home sales in a given month
may show no ZHVI value at all for that period, a real, named gap rather than a smoothed-over
one.

---

### 5. Wildfire risk
**Measures:** how likely a home in this community is to be exposed to wildfire, and how
much loss that exposure represents.

**Real source:** [USFS Wildfire Risk to Communities](https://wildfirerisk.org), tabular
data hosted on the USDA Forest Service Research Data Archive / Ag Data Commons — free
direct spreadsheet/GIS download, **no API key at all**. Reports "Risk to Homes" and
"Wildfire Likelihood" at **community level** (Census-designated-place boundaries) as well
as county/state rollups — the best small-town-friendly geography of any hazard source
researched (better than FEMA's county/tract-only National Risk Index, #8/#9 below).

**Raw direction / normalization:** higher risk score is more concerning — the source is
already framed as a risk index, so this maps onto 0–100 with minimal transformation
(percentile rank among covered communities, matching crime's convention).

**City-level feasibility:** good — community-level tabular rows exist for most Census
places, joinable by place name/GEOID much like crime's agency matching. Some very small
unincorporated spine towns may lack a distinct community polygon and would need a county
fallback, a real, documented (not silent) gap.

**Effort vs. crime:** Medium. A real matching step (community boundary → spine city id),
directly analogous in shape to crime's agency-matching script, plus a percentile-rank
decision.

**Known caveats:** data vintage is May 2024 with only minor 2025 metadata refresh — not a
live yearly feed, so this would ship as a single dated snapshot (`supportsTime: false`)
until USFS republishes, similar to care-access's snapshot posture. Concentrated relevance
in the West/Mountain spine cities — many Eastern/coastal cities will legitimately score
near-zero, which is real, not a data gap.

---

### 6. Air quality
**Measures:** fine particulate matter (PM2.5) and ozone exposure — one of the most
broadly-recognized "is the air here bad" questions.

**Real source:** [EPA AirNow API](https://docs.airnowapi.org) (real-time/forecast AQI by
lat/lon) or [EPA Air Quality System (AQS) Data Mart API](https://aqs.epa.gov/aqsweb/documents/data_api.html)
for historical monitor-level data. Both require a free self-serve signup key (same
api.data.gov-style posture as crime's FBI key) — no paid tier.

**Raw direction / normalization:** higher AQI is worse — maps directly onto 0–100 with
essentially no transformation needed (AQI is already a 0-500+ concern-oriented scale;
clamp/rescale the practically-relevant range).

**City-level feasibility:** the weakest small-town coverage of any candidate researched.
AQI is reported per monitor/"reporting area," not per city — nationally there are only
~2,500 monitors, sparse in the rural West, so nearest-monitor matching for a place like
Sundance WY or Geraldine MT could resolve to a monitor hundreds of miles away, a real,
name-it-explicitly gap directly analogous to crime's non-participating-agency list.

**Effort vs. crime:** Medium. Nearest-monitor matching (a real crosswalk step, like
agency-matching), caching of historical AQS pulls, and an honest "no nearby monitor"
null-return path for the spine's most remote towns.

**Known caveats:** AQS's finalized historical data lags ~6+ months; AirNow's real-time feed
is fast but coverage-limited; both undercount indoor/wildfire-smoke-driven acute spikes that
don't land near a fixed monitor. Should ship with the same "distance to actual monitor"
transparency crime gives distance/matching info.

---

### 7. FEMA National Risk Index (composite natural-disaster risk)
**Measures:** a blended exposure score across 18 real hazards (earthquake, tornado,
hurricane, hail, drought, wildfire, flooding, etc.) — the honest, non-crime "how risky is
this place, structurally" layer.

**Real source:** [FEMA National Risk Index (NRI)](https://www.fema.gov/about/openfema/data-sets/national-risk-index-data),
free CSV/GIS download via OpenFEMA, no key required, current release Dec 2025 (v1.20).

**Raw direction / normalization:** higher NRI Risk Index score is more concerning — already
framed that direction; percentile rank among covered counties/tracts, matching crime's
convention.

**City-level feasibility:** county or Census-tract level only, **no native city output** —
every spine city needs a real geocode-to-county/tract join (Census's free geocoder API
handles this cleanly; not GIS polygon work, a coordinate lookup). County-level rollup
genuinely blurs risk for a small town far from its county seat, a real, documented
limitation (same shape as crime's "one agency, one number" caveat).

**Effort vs. crime:** Medium. Geocode crosswalk (comparable to agency-matching), plus a
real method decision crime.ts already modeled: **don't invent a weighting across
hazards** — ship per-hazard layers (see #9 flood below) rather than one blended number,
the same reasoning crime used to keep violent/property crime separate rather than blending
them.

**Known caveats:** a composite score treats a hurricane-driven coastal risk and a
tornado-driven plains risk as "the same number" if they land at the same percentile —
worth flagging explicitly, same posture as crime's own caveat about NIBRS reporting-practice
variance. County-level blurring is real for small spine towns.

---

### 8. Traffic fatalities / road safety
**Measures:** road-death rate — a real safety metric extending crime's own safety category
that isn't crime at all.

**Real source:** [NHTSA FARS (Fatality Analysis Reporting System)](https://crashviewer.nhtsa.dot.gov/CrashAPI),
free CrashViewer API plus flat-file downloads back to 1975 — **no key required at all**.
2023 is the latest finalized annual release; 2024 exists only as an early national
estimate, not yet crash-level micro-data.

**Raw direction / normalization:** higher fatality rate (per-capita, not raw count) is more
concerning. Raw FARS data is individual crash records with lat/lon and county FIPS — needs
population normalization, unlike crime's already-computed agency rates.

**City-level feasibility:** genuinely flexible — crash-level lat/lon means either a
radius-based spatial join or a county join per spine city, working for both large cities
and small towns (unlike AQI's monitor-sparsity problem). Real strength of this candidate.

**Effort vs. crime:** Medium–Large. Aggregating individual crash records into a per-city
rate is more raw computation than crime's already-aggregated agency counts, and small
towns will show 0–2 fatalities/year — enough volatility that multi-year averaging (a real
method decision, not a given) is needed to avoid a town's score swinging wildly on a single
bad year.

**Known caveats:** final data lags ~12–15 months; small-town raw counts are noisy enough
that single-year rates would be misleading without averaging (worth documenting the window
chosen, the same way crime documents its 2020–2024 window and why).

---

### 9. Flood risk (FEMA NRI single-hazard layer)
**Measures:** flood-specific expected annual loss — the highest-individual-relevance
single hazard for a large share of the spine's coastal/riverine cities.

**Real source:** same [FEMA NRI](https://www.fema.gov/about/openfema/data-sets/national-risk-index-data)
dataset as #7 — it ships hazard-specific sub-scores (including "Inland Flooding" and
"Coastal Flooding") alongside the composite, so this is genuinely the same fetch/join
pipeline as #7 with a different column selected.

**Raw direction / normalization:** higher flood Expected Annual Loss / Risk Index is more
concerning — same treatment as #7.

**City-level feasibility:** identical to #7 — county/tract, geocode crosswalk required.

**Effort vs. crime:** **Small if built after #7** (the fetch/crosswalk/percentile pipeline
already exists — this is one more column). Medium in isolation. Sequencing #7 before #9 is
the actual point: build the NRI pipeline once, harvest flood (and other single hazards) as
near-free follow-ons, the same way crime's two layers (violent/property) share one
pipeline.

**Known caveats:** same county-blur caveat as #7 — a coastal small town's real flood
exposure can differ sharply from its county's blended average.

---

### 10. Health outcomes / chronic disease prevalence
**Measures:** asthma, obesity, and other chronic-condition prevalence — a genuine health
layer beyond care-access's drive-time framing.

**Real source:** [CDC PLACES](https://www.cdc.gov/places/) (Population Level Analysis and
Community Estimates), served via the Socrata API on data.cdc.gov — free, no key required
for basic downloads (an optional free token raises rate limits). Reports 40 measures at
county, **place** (incorporated city/CDP), tract, and ZCTA level — place-level data covers
essentially the full spine, including places with population as low as ~50.

**Raw direction / normalization:** higher prevalence of a concerning condition (asthma,
obesity, diabetes) is more concerning; any protective measures included (e.g., "had a
routine checkup") need inverting before blending.

**City-level feasibility:** genuinely good — place-level PLACES data can often join
directly by place name/GEOID, no polygon crosswalk needed, similar ease to Census ACS.

**Effort vs. crime:** Medium. Real judgment calls: which of the 40 measures to surface as
one or a few layers (crime's own precedent argues against blending unrelated measures into
one invented composite), plus a genuine site-stability risk worth engineering around (see
caveats).

**Known caveats:** cdc.gov/data.cdc.gov were affected by the Jan 2025 federal health-data
takedowns; content has since been restored, and an independent mirror
([restoredcdc.org](https://restoredcdc.org)) exists as a hedge — worth caching downloaded
data at build time rather than depending on a live fetch, and confirming live URLs before
hard-coding them. BRFSS source data is self-reported/survey-based and modeled, not a census.

---

### 11. Unemployment / job market
**Measures:** local unemployment rate — a real, direction-obvious economic-health signal.

**Real source:** [BLS Local Area Unemployment Statistics (LAUS)](https://www.bls.gov/lau/),
free API v2, free self-serve registration key (500 queries/day, 25 years/query
authenticated vs. far less unauthenticated).

**Raw direction / normalization:** higher unemployment rate is more concerning — direct
map onto 0–100, likely percentile rank among covered cities.

**City-level feasibility:** LAUS covers ~7,600 areas including counties, metros, and
**many but not all** incorporated cities/towns by place of residence — some of the
spine's smallest towns may lack their own LAUS series and need a documented county
fallback, the same honest-substitution pattern several other candidates above need.

**Effort vs. crime:** Medium. Real matching/fallback logic (does this city have its own
series, or does it inherit its county's) directly analogous to crime's agency-matching
decision tree.

**Known caveats:** monthly data lags ~1 month; BLS sometimes publishes only annual (not
monthly) series for the smallest places, so time-resolution will genuinely vary city to
city — worth surfacing, not hiding.

---

### 12. Food access / food deserts
**Measures:** share of a low-income population living far from a supermarket — a real,
concrete health-adjacent equity metric.

**Real source:** [USDA ERS Food Access Research Atlas (FARA)](https://www.ers.usda.gov/data-products/food-access-research-atlas) —
free direct Excel/CSV download, no key, no login. County-level companion (Food Environment
Atlas) also exists as a coarser fallback.

**Raw direction / normalization:** higher share of low-income/low-access population is
more concerning — direct map onto 0–100.

**City-level feasibility:** census-tract level; matching a city point to a tract needs one
extra hop (the free Census Geocoder API) — a real but moderate crosswalk step, reusable for
#13 (SVI) below since both are tract-level. Rural tracts can be large enough that a whole
small spine town falls into just one or two tracts, diluting resolution.

**Effort vs. crime:** Medium. Geocode-to-tract crosswalk (comparable to agency-matching),
plus a decision about which FARA measure (there are several low-access thresholds: 0.5mi
urban / 1mi, 10mi rural) best fits a single 0–100 score.

**Known caveats:** FARA's core vintage is ~2019/2021 despite a 2026 rebrand adding new
measures — worth confirming exact vintage before shipping, and naming it, the same way
crime names its exact data-generation date.

---

### 13. CDC/ATSDR Social Vulnerability Index (SVI)
**Measures:** a composite of 16 socioeconomic/demographic variables (poverty, housing
type, disability, limited English, etc.) into one general vulnerability score — closer to a
"how exposed is this community to disaster/crisis broadly" signal than any single-topic
layer above.

**Real source:** [CDC/ATSDR SVI](https://www.atsdr.cdc.gov/place-health/php/svi/svi-data-documentation-download.html) —
free, no key, downloadable by state/county/national (CSV/shapefile/geodatabase). Versions:
2000, 2010, 2014, 2016, 2018, 2020, 2022 (most recent as of this research).

**Raw direction / normalization:** higher SVI percentile is already "more vulnerable" —
maps onto 0–100 with no inversion needed, the only candidate researched with that property.

**City-level feasibility:** tract-level, delivered with county grouping already attached —
same geocode-to-tract crosswalk as #12, genuinely reusable pipeline if both are built.

**Effort vs. crime:** Medium. Crosswalk work shared with #12 if sequenced together; the
real judgment call is whether to use the overall composite or one of its 4 sub-themes
(socioeconomic, household composition, minority status/language, housing/transportation) —
using the overall composite risks the same "different causes, same number" ambiguity noted
for FEMA NRI (#7).

**Known caveats:** same CDC-hosting site-stability caveat as #10 (PLACES); tract-level data
for the smallest, most rural spine towns can carry wide margins of error given small
population denominators; conceptually overlaps with several other candidates here (income,
food access, broadband) since it's built partly from the same underlying ACS variables —
worth deciding whether this adds a genuinely distinct signal or is redundant once #2/#3/#12
already exist.

---

### 14. Extreme heat days
**Measures:** how many dangerously hot days a place experiences in a typical year — an
increasingly relevant climate-adjacent safety metric.

**Real source:** two real options. (a) [CDC Heat & Health Tracker](https://ephtracking.cdc.gov)
(National Environmental Public Health Tracking Network), county-level "Annual Number of
Extreme Heat Days" with a documented HTTP API, free, no key. (b)
[NOAA NCEI U.S. Climate Normals (1991–2020)](https://www.ncei.noaa.gov/products/land-based-station/us-climate-normals),
station-level, free Data Service API, explicitly **no key required at all**.

**Raw direction / normalization:** more extreme-heat days is more concerning — direct map.

**City-level feasibility:** CDC option is county-level (same fallback-blur caveat as other
county sources above); NOAA option is ~15,000 individual weather stations, matchable
nearest-station-to-city-point like AQI's monitor matching, with the same sparse-coverage
risk in remote areas.

**Effort vs. crime:** Medium. Station or county matching (comparable to crime's
agency-matching), plus picking a definition of "extreme heat day" (a real threshold
decision, e.g. NOAA-normals-implied vs. CDC's own definition) worth documenting explicitly.

**Known caveats:** NOAA Climate Normals update only once per decade (current vintage
1991–2020, next expected ~2031) — this reflects long-run climatology, not a live yearly
trend, so `supportsTime` would be honestly false or very coarse; CDC's tracker can lag and
its station-derived interpolation quality varies by region.

---

### 15. Cost of living
**Measures:** how far a dollar goes locally relative to the national average — adjacent to
but distinct from #4's price-to-income ratio (this captures the *general* price level:
groceries, services, rent, utilities, not just housing).

**Real source:** [BEA Regional Price Parities (RPP)](https://www.bea.gov/data/prices-inflation/regional-price-parities-state-and-metro-area),
free API with self-serve signup at [bea.gov/api/signup](https://www.bea.gov/api/signup).
**Reject C2ER/COLI** as a source — confirmed paid-only (Basic Membership $399/yr, quarterly
index ~$185/subscription), a hard violation of the $0-cost constraint despite being the
more commonly-cited cost-of-living index.

**Raw direction / normalization:** higher RPP (cost relative to national average of 100) is
more concerning — direct map, roughly centered on 100.

**City-level feasibility:** the real weak point of this candidate — RPP is published at
**state and metro (CBSA) level only, no place-level output at all**. Spine towns outside
any CBSA (several of the smallest ones) have no metro RPP and would fall back to a
state-level number, a real, coarser-than-usual gap worth naming prominently, more severe
than any other candidate's small-town caveat.

**Effort vs. crime:** Medium, but with a materially weaker payoff than #4/#11 given the
metro-only ceiling — worth sequencing after the stronger economy-category candidates
precisely because of this gap, not because the data itself is hard to fetch.

**Known caveats:** ~18–24 month release lag (Feb 2026 release covers 2024 data); metro-only
means real coverage gaps for the spine's rural towns; conceptually overlaps with #4/#2,
worth deciding whether it earns a separate layer or gets folded into #4's framing instead.

---

### 16. Walkability
**Measures:** how car-dependent vs. walkable a place is — a real, popular urbanist metric.

**Real source:** [EPA National Walkability Index](https://www.epa.gov/smartgrowth/smart-location-mapping),
free CSV via EPA Data Commons/geodata.epa.gov, no key.

**Raw direction / normalization:** lower walkability score is more concerning — invert
EPA's 1–20 scale onto 0–100.

**City-level feasibility:** published at census-block-group level — genuinely requires
population-weighted aggregation up to each city's boundary, using free TIGER
place-to-block-group crosswalk shapefiles. Real GIS work, not a simple join.

**Effort vs. crime:** Large. Block-group aggregation via shapefile crosswalk is a
meaningfully heavier lift than crime's ID-based agency matching — the first candidate in
this backlog that genuinely needs polygon/GIS tooling, not just a lookup key.

**Known caveats:** single dated snapshot (June 2021 publish, 2017–2020 source data) — no
update cadence found, so this ships once and stays static like care-access, not a
refreshable yearly layer; EPA's own methodology notes the index is less reliable in
rural/small-town block groups with low land-use diversity, exactly the profile of several
spine towns.

---

### 17. Parks / green space access
**Measures:** share of a city's population within a short walk of a public park — a real,
popular quality-of-life metric.

**Real source:** Trust for Public Land's headline [ParkScore Index](https://www.tpl.org/parkscore)
is free but **confirmed to rank only the 100 most populous US cities** — would miss most of
the spine's small towns outright. The better fit is TPL's underlying
[ParkServe database](https://parkserve.tpl.org), same free/no-key source, covering
**13,913 US places** — full spine coverage — but it ships park-location and
10-minute-walk-service-area geometry, not a pre-built score; Mapstack would need to derive
its own "% of population within a 10-minute walk of a park" metric from the raw geometry.

**Raw direction / normalization:** higher walk-access % is *less* concerning — invert
(100 − access%) onto the concern scale.

**City-level feasibility:** ParkServe genuinely covers the whole spine (a real advantage
over TPL's own headline product), but at the cost of needing real geometry work (park
polygons × population grid × 10-minute walk buffers) rather than a downloadable per-place
number.

**Effort vs. crime:** Large. Deriving a novel metric from raw service-area geometry is
GIS work beyond anything crime.ts needed — closer in shape to walkability's (#16) block-
group aggregation problem than to any of the direct-lookup candidates above.

**Known caveats:** very small spine towns may have sparse or no mapped parks in ParkServe
at all — a real "no data" case, not a forced zero.

---

### 18. Public transit access
**Measures:** how much real transit service (revenue-miles per capita, route density)
exists locally.

**Real source:** [National Transit Database (NTD)](https://transit.dot.gov/ntd), FTA/DOT,
free, no key, monthly (ridership) and annual (agency profile) CSV/Excel, also mirrored via
a Socrata API on data.transportation.gov.

**Raw direction / normalization:** lower service level is more concerning, but **only
where a transit agency exists at all** — see feasibility below, this is not a simple
invert.

**City-level feasibility:** the real, material gap for this candidate — NTD only covers
agencies receiving FTA 5307 (urbanized) or 5311 (rural formula) funding who report; **many
of the spine's small towns (Sundance WY, Geraldine MT, Monticello UT and similar) have no
reporting transit agency at all.** This must be handled as a genuine "no service reported"
null, not an implied worst-case 100 — collapsing "no data" into "worst score" would be
exactly the kind of smoothing-over this project's own principles reject.

**Effort vs. crime:** Medium–Large. The missing-agency handling is a real design decision
(comparable to crime's non-participating-agency list, but more common here — the majority
of small spine towns will likely hit it), plus normalizing service level by population/area
in a way that's comparable across a huge range of city sizes.

**Known caveats:** as above — expect a large fraction of the spine's smaller towns to
return null on this layer, which needs to be framed as an honest coverage gap in the
methodology doc, not hidden.

---

### 19. Political lean (operator's stated ambition — see framing note)
**Measures:** what the operator described as "political polls and voting and yearly
trends" — the electoral character of a place.

**Real source:** [MIT Election Data + Science Lab (MEDSL)](https://dataverse.harvard.edu/dataverse/medsl_election_returns) —
"County Presidential Election Returns 2000–2024," free CSV on Harvard Dataverse, **no
login/account required**, FIPS-coded, updated through the 2024 cycle. A finer precinct-level
MEDSL product also exists (2016–2024, all 50 states) but ships as raw, frequently-redrawn
precinct shapefiles requiring true point-in-polygon GIS work against boundaries that shift
after every redistricting cycle — a genuinely hard crosswalk, not attempted here.

**Raw direction / normalization — the real open question:** every other candidate in this
backlog has an obvious, politically-neutral "higher = more concerning" direction. **This
one does not.** Left-leaning or right-leaning isn't inherently more or less "concerning" —
forcing one direction would be an editorial/partisan choice this project has no basis to
make, and making it anyway risks the map itself reading as taking a side, which the "no
black boxes, no claimed precision beyond what the data supports" principle
(`README.md`) argues against by extension. The defensible reframe: score **electoral
competitiveness / one-party dominance** (how lopsided recent margins have been) rather than
left/right lean — "concerning" becomes "how uncontested elections here have been," a
neutral, real, computable quantity from the same source data, not a repackaged partisan
score.

**City-level feasibility:** the national MEDSL dataset is **county-level only** — there is
no free national dataset reporting presidential returns within a city's actual municipal
boundary. Some larger cities separately publish their own mayoral/municipal results, but
that's per-agency, inconsistent formats, no unified API, and mayoral races are frequently
nonpartisan anyway, so they don't answer the "political lean" question either. County-to-
city mismatch is real and material: several spine cities are a small fraction of a large
county, or straddle county lines, where the county's aggregate lean can diverge meaningfully
from the city's actual electorate — worth a prominent, un-missable caveat, more central to
this layer's honesty than any FIPS-join mechanics.

**Effort vs. crime:** Large — not because the data fetch is hard (it's a straightforward
free CSV, arguably easier than crime's live API), but because the **normalization-direction
question is a real product decision that has to be resolved before implementation starts**,
unlike every engineering-only candidate above. Treat this as blocked on a product decision,
not just a data task.

**Known caveats:** county-level ≠ city-level, stated above; a competitiveness/dominance
framing changes what the layer is actually answering (not "is this a red or blue city" but
"how contested is this county's vote") — worth being explicit in any methodology doc that
this is a deliberate reframing, not an oversight. A derived turnout-rate metric
(MEDSL total-votes-cast ÷ Census citizen-voting-age-population by county) is a plausible,
**not yet verified**, extension of this same pipeline — flagged here as an idea worth a real
follow-up search, not a confirmed candidate (see Struck out below for the turnout research
that *was* done).

---

### 20. Noise pollution
**Measures:** modeled transportation noise exposure (aviation, highway, rail).

**Real source:** [DOT Bureau of Transportation Statistics National Transportation Noise Map](https://www.bts.gov/geospatial/national-transportation-noise-map),
free downloadable geospatial layers, no key, also cataloged on data.gov/NTAD. Confirmed
real and current.

**Raw direction / normalization:** higher modeled decibel level (Ldn) is more concerning —
direct map.

**City-level feasibility:** a genuine strength — this is a continuous raster/vector surface
covering the whole continental US, not city polygons or county buckets, so sampling at each
spine city's exact lat/lon works uniformly for large cities and tiny towns alike, unlike
most county/tract-bound sources above.

**Effort vs. crime:** Large. No documented REST API was found beyond bulk GIS file
downloads — extracting a per-point value from a raster surface needs real GIS tooling
(e.g. GDAL) not otherwise present in this stack, a one-time build-time dependency more
involved than crime's plain JSON-over-HTTP fetches.

**Known caveats:** this is a *modeled* estimate from traffic volumes, not measured ambient
noise — it captures transportation noise only, missing industrial/urban ambient sources
entirely; updated biannually, so real but infrequent refresh cadence.

---

### 21. School quality (weak — proxy only, lowest confidence)
**Measures:** what the task calls "school quality/ratings" — included here because a real
government source exists, but flagged as the weakest candidate in this backlog.

**Real source:** [NCES Common Core of Data (CCD)](https://nces.ed.gov/ccd/), free, no key,
government-authoritative — but it reports raw operational statistics (pupil-teacher ratio,
per-pupil spending, free/reduced-lunch %), **not a quality or outcome rating**. GreatSchools'
API is confirmed **paid** beyond a limited free trial (metered/enterprise pricing) and
Niche.com has no official free API at all (paid/third-party scraping only) — both rejected
per the $0-cost, no-paid-key constraint.

**Raw direction / normalization:** no natural direction exists for the only free data
available — CCD's raw stats (e.g., pupil-teacher ratio) are, at best, a loose resourcing
proxy, not a quality signal; would need real methodological justification for treating any
of them as "higher = more concerning" that this research didn't find grounds for.

**City-level feasibility:** district-level, joinable to a city only when the city has its
own coextensive school district — many spine cities are served by multiple/overlapping
districts or a county-wide district, making the crosswalk genuinely ambiguous, worse than
any other candidate's geography problem.

**Effort vs. crime:** Large, for a proxy signal weaker than everything else in this
backlog — the honest recommendation is to **not build this** unless a future pass turns up
a real outcome-based source (e.g., state assessment proficiency data via EDFacts, which
exists but wasn't independently verified in this research pass and would need its own
web-search confirmation before being proposed as a real candidate).

**Known caveats:** stated above — no free rating source exists; any proxy built from CCD
raw stats would be presenting resourcing data as a quality claim, which is exactly the kind
of "claimed precision beyond what the underlying data supports" the project's own
principles (`README.md`) warn against.

---

## Struck out: no usable free source found

### Voter turnout (city or county level)
Researched specifically given the operator's stated interest alongside political lean.
The only dedicated turnout dataset found — [Census CPS Voting and Registration Supplement](https://www.census.gov/data/datasets/2024/demo/cps/cps-voting.html) —
is free and government-sourced, but **confirmed state-level only**; its sample size is too
small to support county or city estimates, so it cannot resolve to any individual spine
city, only "what state is this city in," which isn't a usable per-city layer. State
Secretary of State turnout data exists but is fragmented across 50 separate agencies with
inconsistent formats and no unified free national API — high per-state maintenance burden
for a $0, volunteer-maintained OSS project, rejected on the same "free public API or
downloadable dataset" grounds every other candidate above was held to. Excluded as a
standalone layer per the task's own instruction to reject candidates without a plausible
source at usable granularity, rather than shipping a state-level number mislabeled as
city-level.

### Cost-of-living via C2ER/COLI
Not excluded outright — BEA Regional Price Parities (#15) is a real, weaker-but-free
substitute — but noting explicitly that the more commonly-cited, more granular
cost-of-living index (C2ER, formerly ACCRA) is confirmed **paid-only** (Basic Membership
$399/yr, quarterly index ~$185/subscription) and was rejected on the $0-cost constraint.

### School-quality ratings via GreatSchools / Niche
Not excluded outright either — NCES CCD (#21) is a real free fallback — but both of the
actual *rating* products a user would recognize as "school quality" are commercial:
GreatSchools' API is metered/paid beyond a limited free trial, and Niche.com has no
official free API at all. Neither is a viable $0, no-paid-key source.

---

## Cross-cutting implementation notes (for whoever picks this up next)

- **Census cluster (#1–#3):** one API key, one client, near-identical fetch/join shape —
  building the first pays down most of the cost of the other two. The strongest
  "next 3 datasets" cluster in this backlog.
- **Tract-crosswalk cluster (#12, #13):** both need the same free Census-geocoder
  point-to-tract lookup — worth sequencing together for the same reason as the Census
  cluster above.
- **FEMA NRI cluster (#7, #9, and implicitly any other single hazard):** build the
  county/tract fetch-and-percentile pipeline once for the composite risk index, then treat
  flood (and any other single hazard worth surfacing) as near-free follow-on layers, the
  same relationship crime's two layers (violent/property) already have to each other.
  Deliberately **not** blending hazards into one invented-weighting composite, for the same
  reason crime doesn't blend violent and property crime.
- **GIS-tooling cluster (#16 walkability, #17 parks, #20 noise):** all three are the only
  candidates in this backlog that need real geometry work (raster sampling or polygon
  aggregation) rather than a lookup/join — worth evaluating together whether it's worth
  bringing GIS tooling (e.g. GDAL, a shapefile library) into the build pipeline once, for
  the benefit of all three, rather than three separate one-off efforts.
- **"No data" honesty is the recurring theme**, not an edge case: AQI's monitor sparsity,
  NTD's non-reporting small towns, wildfire's unmatched community boundaries, and BEA RPP's
  non-metro towns all produce real, expected nulls for a meaningful share of the spine's
  smallest cities (Sundance WY, Monticello UT, Geraldine MT, Whitewright TX in particular).
  Every one of those should return `null` from `getValue`, per `types.ts`'s own contract,
  and be named in that dataset's methodology doc the way crime names its 9 non-participating
  agencies — never smoothed over or defaulted to a score.
