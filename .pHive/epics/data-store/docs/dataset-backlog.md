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

### 22. Property tax burden
**Measures:** how much of a home's value gets consumed by property taxes each year — the
single most commonly cited "tax burden" metric for homeowners, and a real gap: the original
research pass that produced this backlog never looked at taxes at all. Naturally the next
entry in the Census cluster (#1–#3) once that pipeline exists.

**Real source:** [Census ACS](https://www.census.gov/programs-surveys/acs/data/data-via-api.html)
table `B25103` (`B25103_001E`, "Median real estate taxes paid" across ALL owner-occupied
units, not just those with a mortgage) paired with table `B25077` (`B25077_001E`, median
home value) — same free Census API key as #1–#3. A second, more rigorous real source also
exists: the [Lincoln Institute of Land Policy / Minnesota Center for Fiscal Excellence
50-State Property Tax Comparison Study](https://www.lincolninst.edu/publications/other/50-state-property-tax-comparison-study/),
a free annual report computing true effective tax rates (tax bill ÷ market value) for the
largest city in each state plus the 50 largest US cities and one rural town per state
(~124 locations total) — a better metric, but covering well under half the 168-city spine
and shipped as a PDF report rather than a clean downloadable table, so it's noted here as a
secondary cross-check source rather than the primary pick.

**Raw direction / normalization:** higher ratio (`B25103_001E ÷ B25077_001E`) is more
concerning — direct map onto 0–100, percentile rank among covered cities, matching crime's
convention. A combined "total tax burden" composite blending this with #23/#24 below was
considered per the operator's "overlay of taxes" ask and deliberately rejected — no free
source computes one, and inventing a cross-tax-type weighting (how much does 1% of sales
tax "cost" a resident vs. 1% of property tax?) is exactly the judgment call crime.ts already
declined to make for violent-vs-property crime, and FEMA NRI's entry (#7) already declined
to make across hazard types. Three separate, honestly-labeled layers instead.

**City-level feasibility:** the real advantage of the ACS route over Lincoln Institute's —
place-level 5-year ACS coverage extends to effectively the whole spine, same as #2/#3, with
the same MOE caveat for small towns (here compounded, since it's a ratio of two
independently-estimated medians, not a matched per-home calculation).

**Effort vs. crime:** Small if sequenced after #1–#3 (reuses the existing Census pipeline,
adds two new tables and one division) — Small–Medium in isolation. The cheapest of the
three tax candidates researched here.

**Known caveats:** this is a survey-based approximation of effective rate, not the
assessed-value calculation Lincoln Institute's study performs — the two will diverge,
sometimes sharply, in states with large assessment-vs-market-value gaps (California's
Prop 13, Michigan's assessment caps, and similar). `B25103` also measures only
owner-occupied households — renters (who pay property tax indirectly via rent) aren't
represented, a real conflation worth naming the same way broadband (#3) names
subscription-vs-availability.

---

### 23. Combined sales tax rate
**Measures:** the combined state + local sales tax rate a resident actually pays at
checkout — genuinely available at real municipal granularity, unlike income tax (#24)
below.

**Real source:** [Tax Foundation, "Sales Tax Rates by City"](https://taxfoundation.org/data/all/state/sales-tax-rates-by-city-2024/) —
free downloadable Excel, no key, no login, covering combined state+local rates for
incorporated places with population over 200,000 (~122 cities as of the 2024 edition, the
most recent found). For spine cities below that threshold, Tax Foundation's companion
[state-level report](https://taxfoundation.org/data/all/state/sales-tax-rates/) (confirmed
updated twice yearly) supplies a population-weighted average local rate as a documented,
coarser fallback — the same two-tier honesty pattern LAUS's county fallback (#11) already
established.

**Raw direction / normalization:** higher combined rate is more concerning — direct map
onto 0–100.

**City-level feasibility:** genuinely real city-level data for roughly the largest
third-or-so of the spine (every spine city over ~200k population), state-level fallback for
the rest — a real, two-tier coverage story that must be shown explicitly per city, not
silently blended, the same transparency this project already gives LAUS/wildfire/NTD
fallbacks.

**Effort vs. crime:** Medium. Single free source, but a real design decision (which cities
get the city-specific number vs. the state fallback, and how to flag that difference in the
detail string) — comparable in shape to unemployment's (#11) fallback logic.

**Known caveats:** the city-level product's own refresh cadence is less clear than the
state-level report's confirmed twice-a-year cycle — treat the 2024 city vintage as a dated
snapshot until a newer edition is confirmed, the same posture as wildfire risk's (#5) single
dated vintage. Sales tax also doesn't apply evenly to all spending (many states exempt
groceries/medicine), so the headline combined rate is a real but imperfect proxy for actual
household sales-tax burden.

---

### 24. State income tax rate (state-level only — real, but geography-limited)
**Measures:** what the operator's "overlay of taxes" ask implies as income tax burden — the
real answer this research found is that it's a *state* policy variable almost everywhere,
not a city one.

**Real source:** [Tax Foundation, State Individual Income Tax Rates and Brackets](https://taxfoundation.org/data/all/state/state-income-tax-rates-2026/) —
free, no key, published annually, exact statutory rates rather than a survey estimate (no
MOE problem at all, an actual advantage over several Census-based candidates above). Nine
states levy no income tax; the rest range from flat rates (14 states, plus Ohio moving to
flat in 2026) to graduated brackets running up to 13.3% (California's top rate).

**Raw direction / normalization:** higher applicable rate is more concerning — direct map
onto 0–100, using the rate that applies at each spine city's local median household income
(#2) rather than the top marginal bracket, to avoid overstating burden for a typical
resident.

**City-level feasibility:** the real, honest limit of this candidate — in the 41 states with
a broad-based income tax, every spine city in that state gets the identical number, exactly
the "this reflects your state, not your city" gap political lean (#19) and the struck-out
voter turnout entry below already surfaced. A genuine city-level exception exists for a real
but short list of cities with their own local income/wage tax layered on top of the state
rate (New York City ~3.876%, Philadelphia's wage tax ~3.75%, a number of Ohio and
Pennsylvania municipalities, Louisville/Kansas City/St. Louis, and similar) — no unified
free national dataset of these local add-on rates was found; capturing them would mean a
real but small hand-maintained follow-on list, not a blocking one.

**Effort vs. crime:** Small — simplest of the three tax candidates to fetch (one static
table, no crosswalk, no matching) — but ranked last of the three anyway, for the same reason
political lean (#19) is ranked below its engineering effort would otherwise suggest:
shipping a layer that reads as "your city's taxes" but is actually identical across every
city in a state is a real product-honesty question, not just a data task, and needs the same
explicit "reflects your state" framing political lean already established before this is
worth building.

**Known caveats:** as above — state-level only for the overwhelming majority of the spine;
the minority of cities with a real local add-on tax would need a separate, manually-sourced,
harder-to-maintain layer if that precision is ever wanted. Marginal-vs-effective rate is a
real modeling choice worth documenting explicitly (a resident at the local median income
rarely pays their state's top marginal rate).

---

### 25. Housing inventory / home availability
**Measures:** how many homes are actively for sale in a city right now, normalized by
population — a "how hard is it to find something on the market here" supply signal, a real
gap distinct from #4's price-to-income affordability question (a place can be affordable on
paper and still have almost nothing listed).

**Real source:** [Zillow Research's Housing Data portal](https://www.zillow.com/research/data/),
same free-CSV, no-login posture as ZHVI (#4). The specific file — For-Sale Inventory, verified
live at `https://files.zillowstatic.com/research/public_csvs/invt_fs/City_invt_fs_uc_sfrcondo_sm_month.csv`
— reports the count of unique for-sale single-family/condo listings active in a given month,
updated monthly (latest column as of this research: June 2026), at true **city** level (also
ZIP/county/metro/neighborhood/state/national). Directly checked against all 168 spine cities
by downloading and joining the live file (not assumed): 167/168 present.

**Raw direction / normalization:** the raw column is a listing count, meaningless without a
population denominator — 50 active listings means something very different in Sundance WY
than in Houston TX. Pair with Census PEP population (#1, pipeline already built) to compute
listings-per-1,000-residents; lower listings-per-capita is more concerning (tighter supply,
harder to find a home), inverted onto 0–100, percentile rank matching crime's convention. A
real tension worth naming explicitly: very low supply is sometimes a symptom of a place being
genuinely desirable, not distressed — the same both-directions caveat #1 (population growth)
already carries for its own metric; this score measures market tightness, not desirability.

**City-level feasibility:** the best of any real-estate candidate researched — 167/168 spine
cities present via direct city/state-name join. The one real crosswalk friction: Zillow spells
out "Saint" rather than abbreviating "St." (Saint Louis, Saint Petersburg, Port Saint Lucie),
a small but necessary name-normalization step before joining, not a data gap. Only Geraldine,
MT has no Zillow-reported listing series at all — Zillow needs a minimum transaction/listing
volume to report a market, and this is that real, honest null, joining the same small-town
gap list #1's caveats and crime's agency-matching already established.

**Effort vs. crime:** Small–Medium if sequenced after #1 (Census population pipeline) and #4
(Zillow's static-CSV-no-key fetch pattern already exists for ZHVI) — reuses both directly.
Medium in isolation. The one real design decision: population-normalization method
(per-1,000-residents, the simplest defensible choice, vs. a derived months-of-supply proxy
that Zillow doesn't publish at this geography and this project has no sales-volume source to
build one from).

**Known caveats:** For-Sale Inventory is a raw active-listing count, not "months of supply"
(which needs a home-sales-rate denominator not available at city grain from any free source
found) — a real, named simplification, not the housing economist's preferred metric. Small
spine towns' listing counts can sit in the single digits, so month-to-month swings for the
tiniest towns will be noisy from small-denominator statistics alone, the same caveat #1
(population) and #8 (traffic fatalities) already name for their own small-town volatility.

---

### 26. Days on market
**Measures:** how many days a typical active listing sits before going under contract — the
"how fast is this market moving" complement to #25's raw supply-count question.

**Real source:** the same [Zillow Research data portal](https://www.zillow.com/research/data/)
as #4/#25 — the specific file, Mean Days to Pending, verified live at
`https://files.zillowstatic.com/research/public_csvs/mean_doz_pending/City_mean_doz_pending_uc_sfrcondo_sm_month.csv`,
free, no login, updated monthly, reported at true city level.

**Raw direction / normalization — the real open question:** unlike #25, there's no single
obvious "more concerning" pole here, a tension closer to political lean's (#19) than any
other economy-category candidate. A very LOW days-on-market number (homes selling in days)
reads as "hard to compete for a home here" from a prospective mover's perspective — the
framing adopted here for consistency with #25: fast turnover inverted onto the concern scale
(low days = high concern), pairing conceptually with #25 as a shared "market tightness" pair.
But this is a real, named editorial choice, not an objective fact the data supplies on its
own — a fast market is also a legitimate positive signal (a place everyone wants to live),
the same both-directions tension #1 (population growth) already flags for its own metric.
Worth stating as a deliberate framing decision in any methodology doc, not an oversight.

**City-level feasibility:** real, but thinner than #25 — of the 168 spine cities, 161/168
(95.8%) have a reported city-level days-to-pending series (after the same "Saint" vs "St."
name-normalization step as #25, directly verified by downloading and joining the live file).
The 7 gaps (Sundance WY, Blanding UT, Monticello UT, Taos NM, Geraldine MT, Kalispell MT,
Whitewright TX) are exactly the kind of low-transaction-volume small towns already flagged as
ZHVI's (#4) sparse-history risk — Zillow needs a real flow of pending sales, a thinner bar
than the one needed to report a listing count (#25).

**Effort vs. crime:** Medium. Same free-CSV mechanics as #25 (Small on the fetch alone,
reusing #4's Zillow pipeline), but the real cost is the direction/framing decision above — a
genuine product call, not just an engineering one, in the same shape as political lean's
(#19) "blocked on a product decision" reasoning, though narrower in scope since a defensible
default (fast-market-as-concerning) does exist here, unlike #19.

**Known caveats:** as above, direction is a deliberate framing choice, not a neutral fact —
should be named explicitly in any methodology doc. 7/168 spine cities have no reported value
and need a real, shown null (same honesty posture as every small-town gap elsewhere in this
backlog). Zillow's own methodology reports a *mean*, not median, days-to-pending — more
sensitive to a handful of stale outlier listings than a median would be, worth naming the
same way ZHVI's (#4) own "modeled, not transaction-price" caveat is named.

---

### 27. Average household wealth / net worth (weak — modeled estimate, no city-level source, lowest confidence)
**Measures:** what the operator asked for as "average wealth" — household net worth (assets
minus liabilities: home equity, retirement and investment accounts, business equity, minus
debt), a genuinely distinct concept from #2's median household income (a flow, not a stock).
This research confirmed there is no direct city-level, or even reliable metro-level,
government source for this — see the real alternatives checked and rejected below.

**Real source:** the authoritative source, the Federal Reserve's
[Survey of Consumer Finances (SCF)](https://www.federalreserve.gov/econres/scfindex.htm) —
triennial, 2022 is the latest published wave, a 2025 wave is expected to publish in late
2026 — is confirmed **national-level only**; no state, metro, or city breakdown exists in any
published SCF table or public microdata, a harder geographic ceiling than even #15's
(cost-of-living) metro-only floor. Two ACS-based proxies were checked and rejected as
freestanding candidates: (a) ACS median home value (table `B25077`, already used by #4/#22)
measures gross home value, not net-of-debt equity — ACS collects no mortgage-balance/debt
data at all, making it a poor wealth proxy on its own and redundant with #4/#22's existing
framing if reused here; (b) [IRS SOI ZIP-code data](https://www.irs.gov/statistics/soi-tax-stats-individual-income-tax-statistics-zip-code-data-soi)
on investment income (dividends, interest, capital gains) is real and free, but ZIP codes
with under 100 returns are suppressed entirely (a real problem for the spine's smallest
towns), ZIP boundaries don't respect city limits (a worse crosswalk problem than any
tract/county source already in this backlog), and it mostly re-measures income derived from
capital rather than net worth, overlapping with #2 instead of adding a distinct signal. The
one real sub-national estimate found:
[GEOWEALTH-US](https://www.openicpsr.org/openicpsr/project/192306/version/V4/view) (Suss,
Kemeny & Connor, *Nature Scientific Data*, 2024) — free, CC BY 4.0 licensed, downloadable via
ICPSR (DOI 10.3886/E192306) with only a free account required, the same free-account posture
as this backlog's other gated sources. It's a machine-learning model trained on real SCF
household records, used to impute household wealth onto ACS/Census microdata, reporting
mean/median wealth and inequality measures at commuting-zone (741 zones), metro-area (573
areas), and PUMA (11,805 areas, ~100k population each) geography, 1960–2020 (2020 is the
latest vintage).

**Raw direction / normalization:** lower estimated median household wealth is more
concerning — direct map onto 0–100, percentile rank among covered geographies matching
crime's convention. This is the one candidate in this entire backlog whose headline number is
itself a statistical model's prediction rather than a directly reported or directly computed
figure — a materially different kind of "known limitation" than any real source above, called
out here explicitly rather than folded into the usual caveat language.

**City-level feasibility:** the real, material weak point — **no output at municipal/place
geography exists at all**, even PUMA (the finest level GEOWEALTH-US offers) is a Census
statistical geography of roughly 100,000 residents that frequently spans multiple small
spine towns or covers only a fraction of one large city, not a city-boundary match. Every
spine city would need a real, documented city-to-PUMA (or coarser, city-to-CZ/metro)
crosswalk decision, and the same "this reflects your region, not your specific city" caveat
#15/#19/#24 already established would need to be even more prominent here than for any of
those, since PUMA/CZ boundaries are far less recognizable to a user than a metro name or a
state.

**Effort vs. crime:** Large. Combines a real, non-trivial geography crosswalk (city-to-PUMA
point-in-polygon, needing PUMA boundary shapefiles — GIS work in the same weight class as
#16/#17/#20) with a genuine, unresolved product question (is presenting a machine-learning-
imputed estimate, on a geography most users have never heard of, as "your city's wealth"
consistent with this project's own no-invented-precision principle?) that has to be resolved
before implementation starts — the same blocking-product-decision shape as political lean
(#19), stacked on top of real GIS effort #19 doesn't require. The single largest-effort,
lowest-confidence candidate in this backlog.

**Known caveats:** modeled/imputed, not measured — the authors' own validation shows
materially weaker accuracy for negative-net-worth households (RMSE 1.48, correlation 0.38)
than for positive net worth (RMSE 0.99, correlation 0.94), the group arguably most relevant
to a "concerning" framing. No sub-state geographic validation exists at all, because no other
public wealth dataset carries geographic identifiers below the state level — so GEOWEALTH-US's
own sub-state accuracy is essentially unverifiable by its own authors' admission, a real and
unusual epistemic gap worth stating plainly rather than smoothing over, more fundamental than
any coverage gap or MOE caveat elsewhere in this backlog. Latest vintage is 2020 — six years
stale as of this research, a single dated snapshot with no confirmed refresh cadence. On
balance: closer to #21's "weak — proxy only" posture than a fully struck-out candidate, kept
in the backlog because a real, free, citable, peer-reviewed source does exist (unlike voter
turnout's struck-out entry below, which had no sub-state source at all) — but ranked last of
every candidate in this backlog, and any future implementation should treat it as the most
heavily-caveated layer in the project, not a routine build.

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

### Total tax burden composite (WalletHub-style)
Considered per the operator's "overlay of taxes" ask and rejected as a standalone layer —
no free source computes a genuine combined property+income+sales composite (WalletHub's own
well-known version is a proprietary in-house calculation, not a public dataset). Building
one in-house would require inventing a cross-tax-type weighting this project has no basis
to make — see #22's normalization note. Three separate, honestly-labeled layers (#22–#24
above) instead of one invented number.

### Sales tax via commercial API (Avalara AvaTax)
Not excluded outright — Tax Foundation's city-level table (#23) is a real, free substitute —
but noting explicitly that Avalara's frequently-cited "free" sales-tax API is confirmed to
be a time-limited (90-day) trial account, not a permanent $0 source, the same paid/metered
rejection this backlog already applied to GreatSchools (#21) and C2ER (#15).

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

---

## Addendum (dvd-4, dataset-verification-drive epic) — fresh sweep after #1–27 shipped

By the time this addendum was written, every #1–27 candidate ranked medium-or-higher
confidence had shipped (including #15 cost of living, this same session), and #7/#9 turned
out to already be covered by `hazard.ts`'s composite + sub-layers. This section is a fresh
search for genuinely new candidates, each live-checked (not assumed) against its real API/
download endpoint.

### 28. School district per-pupil spending (upgrades #21 from "weak proxy" to real, direct data)
**Measures:** real per-pupil education revenue/spending by school district — a direct
government-finance number, not a ranking-service proxy. #21 in this same doc rated school
quality "weak (proxy only, lowest confidence)" because GreatSchools/Niche-style *ratings*
aren't real measured data; per-pupil spending is.

**Real source:** [Urban Institute Education Data Portal API](https://educationdata.urban.org/documentation/),
built on NCES Common Core of Data (CCD) F-33 school district finance survey. **No API key
required** — confirmed live: `GET https://educationdata.urban.org/api/v1/school-districts/ccd/finance/2020/?leaid=3620580`
returned real NYC Department of Education revenue data (`rev_total: $34.6B`, breakdowns by
federal/state/local source) with zero authentication.

**City-level feasibility:** confirmed live via the sibling `ccd/directory` endpoint, which
carries a real `county_code` field per district (e.g. NYC's district → `36061`, matching
this repo's own Census county FIPS format exactly) — reuses `data/raw/city-county-fips.json`
unchanged, the same crosswalk `unemployment.ts`/`cost-of-living.ts` already lean on. Spot-
checked a genuinely rural case too: querying `fips=49` (Utah) and filtering to
`county_code=49037` (San Juan County) returned "San Juan District" based in Blanding, UT —
real coverage for one of this spine's smallest, most isolated cities, not just NYC.

**Raw direction / normalization:** no obviously "more spending = better" or "= worse" a
priori (a real methodological question education-finance research treats seriously) — this
would need to ship as a transparent dollar figure (like #2 income), NOT a
scored/direction-implying 0–100 concern the way most other layers work, or ship two framings
(a high-spending-is-good civic-investment framing AND explicit non-scoring of the raw number)
rather than picking one silently.

**Effort vs. crime:** Medium — one new API client (no key friction, unlike BEA/BLS/Census),
reuses the existing county crosswalk entirely, but the district-to-county join can be
many-to-one (a county can contain several small districts) requiring a real aggregation
decision (population-weighted average per county, most-likely-district-by-city-name-match,
or similar) not yet designed.

**Known caveats:** 2020 is the latest real year available (2021 query returned zero rows
live) — a real ~5-year release lag, worse than most datasets in this backlog. District
boundaries don't always align with city boundaries (the many-to-one join above). No
national per-pupil "concerning range" convention exists the way there is for e.g.
unemployment or property tax rates, so a defensible 0–100 scoring scheme needs real design
work before this can ship, not just a fetch script.

**Confidence: medium** — real, live-verified, keyless data with a working crosswalk; the
open item is scoring design, not data availability.

### 29. Toxics Release Inventory (TRI) facility density/proximity
**Measures:** proximity to and density of EPA-regulated industrial facilities reporting
toxic chemical releases — a genuinely different environmental-justice-adjacent signal from
AQI (current air quality) and SVI (general social vulnerability), closer in spirit to
FEMA NRI's hazard-proximity framing than to AQI's day-to-day pollution reading.

**Real source:** [EPA Envirofacts TRI API](https://www.epa.gov/enviro/envirofacts-data-service-api),
`https://data.epa.gov/efservice/tri_facility/...` — confirmed live, no API key required.
`COUNT` query confirms 64,990 total facility records nationally (open + historically
closed, `fac_closed_ind` field distinguishes). Real per-facility lat/lon
(`pref_latitude`/`pref_longitude`) and a real county FIPS field
(`state_county_fips_code`) both present — two independent, both-real ways to join to the
spine (nearest-distance like `heat.ts`'s station matching, or county tier like
`unemployment.ts`'s fallback).

**Note on the endpoint itself:** table-name casing affects response format in a way worth
flagging for whoever builds this — `TRI_FACILITY` (uppercase) returned XML despite a
`/JSON` path suffix; `tri_facility` (lowercase) returned real JSON. A real endpoint quirk,
not a documentation error — confirm live before assuming either casing works.

**Raw direction / normalization:** higher density / closer proximity is more concerning —
direct rescale against a data-informed cap (facility count within N miles, or distance to
nearest facility), same shape as the drive-time-to-concern pattern `care-access.ts` already
uses.

**Effort vs. crime:** Medium — needs `fac_closed_ind` filtering (exclude closed facilities
from a "current risk" framing, but note closed sites can still carry contamination — a real
framing decision), then either a nearest-distance or radius-count computation across
~65k records against 512 cities.

**Confidence: medium** — real, live-verified, keyless, two independent real join paths.
Strong candidate for a future build; not selected as this round's dvd-5 pick only because
per-pupil spending (#28) more directly closes a gap already named in this backlog (#21).

**UPDATE (dvd-6 attempt, real live finding):** attempted to build this next and hit a
real feasibility blocker the small `COUNT`/single-facility test queries above didn't
surface — `data.epa.gov/efservice`'s **bulk** query path is impractically slow at the
scale this needs. A single-state pull (`tri_facility/state_abbr/NY/fac_closed_ind/0/JSON`)
ran for **16+ minutes** and still returned a truncated, invalid-JSON response (cut off
mid-string at ~1MB). Fetching all 51 states this way is not tractable in any reasonable
build session. Downgrading this from "strong candidate" to **blocked on a faster access
path** — a bulk CSV/FTP download from EPA's TRI Basic Data Files
(https://www.epa.gov/toxics-release-inventory-tri-program/tri-basic-data-files-calendar-years-1987-present)
is the likely real fix (annual pre-built national files, not a live query API), but
that's real, separate follow-up work, not a same-session pivot. Not struck out —
genuinely blocked on access method, not on data availability or real-world relevance.

### 30. Census Business Patterns (business/establishment density)
**Measures:** local business establishment count and employment, a economic-vitality signal
distinct from unemployment (joblessness rate) — density of commercial activity rather than
the workforce's employment status.

**Real source:** [Census Business Patterns (CBP)](https://www.census.gov/programs-surveys/cbp.html)
via `api.census.gov` — reuses the existing `CENSUS_API_KEY`, no new credential needed.
Confirmed live: `GET .../2023/cbp?get=NAME,EMP,ESTAB&for=county:061&in=state:36` returned
real data for New York County (93,904 establishments, 2,322,720 employees). 2023 is the
latest vintage (2024 query 404s — real release lag, same pattern as every other Census
product this session hit).

**City-level feasibility:** **no place-level geography at all** — confirmed live via
`.../2023/cbp/geography.json`, which lists only us/state/county/CBSA/CSA/congressional-
district/zip. County-level only, same fallback tier `unemployment.ts`/`cost-of-living.ts`
already use, but with no city-level tier above it this time (unlike unemployment's
494-city-tier/18-county-tier split) — every city in this dataset would be county-level,
a real, coarser-than-most precision gap worth naming prominently.

**Confidence: low-medium** — real and keyless, but the county-only ceiling (no city tier
at all) and conceptual proximity to unemployment (#11, already shipped) make this the
weakest of the three new candidates in this addendum.

### Considered this round, not pursued (real live-check results)
- **IMLS Public Libraries Survey** — the URL pattern tried (`imls.gov/research-evaluation/
  data-collection/public-libraries-survey`) 404s live; IMLS restructured its site since this
  was last known and the real current API/download path needs a fresh lookup before this
  can be ranked. Not struck out — genuinely unchecked, not confirmed-unavailable.
- **USDA local food / farmers market directory** — `usdalocalfoodportal.com`'s API returned
  a real, live `403 Forbidden` on an unauthenticated request; needs a real registered key to
  even evaluate further. Deferred, not struck out.
- **FCC National Broadband Map API** — the public map API's `listAvailableSpecificationVersions`
  endpoint returned a real, live `405 Method Not Allowed` on a plain GET; likely needs a
  different HTTP method or an API key this project doesn't have. Deferred, not struck out.

**This round's pick for dvd-5: #28 (school district per-pupil spending)** — real, keyless,
live-verified crosswalk down to the spine's smallest rural cities, and directly upgrades an
already-identified weak spot (#21) rather than adding an entirely new category.
