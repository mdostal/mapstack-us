# Full-resolution spine — research findings

Research pass answering the open question raised in
[`full-resolution-spine-decision.md`](./full-resolution-spine-decision.md): every Mapstack
dataset has a genuinely different real ceiling on "as complete as possible" — this doc pins
down the actual numbers per dataset, checks them against live sources where possible, and
proposes a concrete recommendation. **Research only — no code, no schema changes, no data
regenerated.** Web-searched 2026-08-02/03, current DB inspected directly rather than assumed.

---

## 1. Census-sourced datasets: does ACS5 really cover ~19,500 places, incl. small towns?

**The ~19,500 figure is real and confirmed at the source.** The Census Bureau's own story
["America: A Nation of Small Towns"](https://www.census.gov/library/stories/2020/05/america-a-nation-of-small-towns.html)
(census.gov, May 2020, Vintage 2019 estimates) states there are **~19,500 incorporated
places** in the U.S., of which **76% have fewer than 5,000 people**. A separate figure
found — **19,502 incorporated places as of July 31, 2019** — corroborates the same order of
magnitude. This directly matches the `full-resolution-spine-decision.md`'s "~19,500" claim;
not a round-number guess.

**ACS 5-year estimates genuinely have no population floor**, unlike the 1-year product.
Confirmed from Census's own documentation: **1-year estimates require population ≥65,000**
(this is already noted correctly in `dataset-backlog.md`'s #2/#22 entries), while **5-year
estimates cover every geography down to census tract and block group, with no minimum
population size**. This is a real design property of the 5-year product (it pools 60 months
of sample to make small-area estimation possible at all), not an incidental side effect — so
a town smaller than Geraldine, MT (pop. 260) is, by design, exactly the kind of place ACS5
exists to still produce an estimate for.

**I could not independently verify this by querying the live Census API** — `api.census.gov`
now hard-redirects every request (even simple `place:*` pulls) to a "missing key" page
regardless of query volume, and no `CENSUS_API_KEY` exists anywhere in this repo or its
`.env`. This is disclosed rather than smoothed over: the finding above rests on Census's own
published documentation and geography-level metadata (`/data/2023/acs/acs5/geography.json`,
which *is* fetchable without a key and confirms `place` is a valid, state-scoped geography
level for the ACS5 dataset), not a first-party row-count check of a specific small town like
Geraldine. A real follow-up before implementation: sign up for the free key
(`api.census.gov/data/key_signup.html`, already referenced in `dataset-backlog.md`) and
directly confirm Geraldine, MT and Sundance, WY return non-null `B01003_001E` /
`B19013_001E` rows.

**Suppression is real but narrower than "small towns have gaps."** The distinction that
matters: **ACS suppresses individual table *cells* when the underlying sample count is too
small to compute a reliable estimate** (Census's own ACS handbook: an `**` or `N` flag marks
a cell with "no sample observations or too few sample observations... to compute a standard
error"), not whole geographies. This mechanism bites hardest on **detailed cross-tabulated
tables** (e.g., income by race by age for a town of 300 people) — not on the simple,
single-number aggregates the Census-cluster backlog entries actually plan to use:
`B01003_001E` (total population — a single count with no cross-tab), `B19013_001E` (median
household income — one number per place). These basic tables are **essentially never fully
suppressed** even for the smallest ACS5 geographies. What *does* happen, and is real:
**margin of error (MOE) balloons** for small-sample places — one documented Census example
shows an ACS5 block-group estimate of 28 people with a MOE of ±33 (i.e., the interval crosses
zero). `dataset-backlog.md` already names this correctly for income (#2) and broadband (#3)
as a "show it, don't hide it" caveat — this research confirms that framing is the right one:
**expect real values for effectively all ~19,500 places on basic ACS5 tables, with
honestly-wide confidence intervals for the smallest, not silent data gaps.**

**Net finding for Q1:** Census-cluster datasets (population growth/PEP, income, broadband,
property tax, sales tax's state-fallback tier, housing inventory via Zillow+PEP) have the
widest real ceiling of any Mapstack data source — genuinely reachable to (near) all ~19,500
incorporated places, the widest ceiling in this backlog by a wide margin. The one dataset in
this cluster that does NOT reach 19,500 is **combined sales tax** (`dataset-backlog.md` #23)
— Tax Foundation's city-level table only covers cities over ~200,000 population (~122
cities), with a **state-level** (not place-level) fallback for the rest; that fallback still
produces a value for every place (via its state), just a coarser one, honestly flagged.

---

## 2. Crime (NIBRS): what's the real national agency-participation ceiling?

**Real, current, sourced figure (2024, most recent published year):** per the FBI's own
["Reported Crimes in the Nation, 2024" FAQ](https://cde.ucr.cjis.gov/LATEST/resources/reports/Reported%20Crimes%20in%20the%20Nation%202024%20FAQs.pdf)
and [FBI press release](https://www.fbi.gov/news/press-releases/fbi-releases-2024-reported-crimes-in-the-nation-statistics):

| Figure | Count | Population coverage |
|---|---:|---:|
| Agencies actively enrolled in the UCR Program (NIBRS + SRS combined, the whole eligible universe) | 19,328 | — |
| Agencies that submitted via **NIBRS** specifically | **14,601** | **87.2%** of UCR-enrolled-agency population |
| Agencies still on the older Summary Reporting System (SRS), not yet transitioned | 2,074 | +8.4% (additional pop. covered on top of NIBRS) |
| NIBRS + SRS combined | 16,675 | 95.6% |

**The real ceiling for this specific dataset is 14,601, not 19,328 or 16,675.** This is a
deliberate, important distinction the crime methodology needs to preserve: Mapstack's crime
pipeline (`scripts/gen_crime_data.py`) computes violent/property rates from **monthly NIBRS
incident-level counts**, which the older SRS format doesn't provide in the same
offense-group structure — an SRS-only agency (2,074 of them, 8.4% of population) is not a
usable input to this dataset's method even though it *is* a UCR-enrolled, "reporting"
agency. So **14,601 NIBRS-reporting agencies, covering 87.2% of the U.S. population, is the
real, current national ceiling** for how many agencies could ever feed this dataset — up
sharply from "less than 30 percent [population coverage] in 2015," confirming the crime
methodology doc's own note that coverage "grows every year."

**Open gap, disclosed rather than guessed:** 14,601 is an **agency** count, not a **place**
count — the FBI's UCR universe includes state agencies, county sheriffs, university/college
police, and tribal agencies alongside municipal police departments, and a single
incorporated place is sometimes covered only by its county sheriff (no separate municipal
PD, e.g. Augusta GA in the current methodology) or, per the current doc's own experience,
sometimes has literally no agency in the FBI's directory at all (Sundance WY, Monticello UT,
Geraldine MT — the current 165/168 match rate). **I could not find a published FBI figure
for "how many of the ~19,500 incorporated places have their own NIBRS-reporting municipal (or
consolidated city-county) agency"** — that number only emerges by actually running the
agency-matching step (`scripts/fetch_crime_agencies.py`'s method) against a much larger
candidate list, the same way the current 168-city spine's 165/168 match rate was established
empirically, not looked up. Given the current match rate (98.2%) held for the current
(mostly larger, more populous) spine, and given NIBRS/UCR participation skews toward larger,
better-resourced departments, **a reasonable expectation — not a verified figure — is that
the real matched-place ceiling for this dataset, run against the full ~19,500-place
universe, lands well under 14,601** (likely in the low thousands to high hundreds, since
many of the 19,500 places are tiny towns policed by a county sheriff with no separate,
directly-reporting municipal agency) but is **meaningfully larger than the current 168** or
the pending 511-city candidate spine. This is the one number in this research pass that
genuinely requires running code (not just searching) to pin down precisely — flagged as a
concrete follow-up, not asserted here.

---

## 3. Care access and allergy severity: confirmed not source-limited; compute cost is trivial

**Re-confirmed from both methodology docs, nothing new required to re-verify this claim:**

- **Care access** (`data/care-access-methodology.md`) is explicitly a **haversine
  straight-line distance formula** (`distance_mi * 1.25 / 55 mph`) to the nearest of a fixed
  facility list (168 general, 92 pediatric-specialty, 64 pediatric-cardiac — **324 total
  facility records** across all 3 layers, not "up to 568" as this task's framing
  speculated; the real counts are the ones in the methodology doc). This is pure
  arithmetic over any `(lat, lon)` — no source-coverage ceiling exists for the *scoring*
  step. The methodology doc's own known-limitations section already documents the real
  practical caveat (haversine breaking down across water for Hawaii/Alaska) — a modeling
  accuracy issue, not a coverage-availability one.
- **Allergy severity** (`data/allergy-scoring.md`) is a **closed-form formula** over 5
  climate/geography inputs (Köppen zone, per-city turf/aridsw flags, elevation, coastal
  flag, latitude for one zone) — again pure arithmetic, computable for any point with those
  5 inputs known.

**Compute cost of the scoring step itself, for the full ~19,500-place ceiling, is trivial,**
confirming the task's own framing: nearest-facility search across 3 layers × 19,500 points ×
324 facility records ≈ **6.3M haversine distance calculations** (19,500 × (168+92+64)) —
sub-second to low-single-digit-seconds in Node even brute-force/unindexed, no spatial index
needed at this scale. The allergy formula is O(1) per place with no search step at all —
19,500 evaluations of a five-term arithmetic expression is not a measurable build-time cost
by any normal standard.

**The real bottleneck for extending these two datasets to ~19,500 places is NOT the scoring
math — it's populating the geographic *inputs* (the spine itself) at that scale**, which
this task didn't explicitly ask about but is the honest finding here: `care-access` and
`allergy` both key off `data/cities.json`'s per-city `lat/lon/elevation_ft/koppen/coastal`
fields, currently populated for only 168 places (and, per `cities-500-candidate-methodology.md`,
freshly computed for 344 more via **live, one-at-a-time API/raster queries** — USGS EPQS for
elevation, a Beck et al. 2018 Köppen raster point-sample, hand/heuristic turf & coastal
flags). That pipeline is real and scriptable (not source-limited either — USGS EPQS and the
Köppen raster are both free, complete-coverage sources), but running it against ~19,500
points instead of 344 is a **~56× bigger version of exactly the same job**, including its
already-disclosed weak points (the `coastal` flag has "no authoritative coastline-distance
dataset joined... assigned by hand," a real gap that gets harder to sustain by hand at
19,500-place scale and would need a real coastline/estuary dataset before it could scale
honestly). **In short: care-access and allergy's real ceiling is not 19,500 today — it's
"however many places the geographic spine itself has real lat/lon/elevation/Köppen/coastal
data for,"** and growing the spine to 19,500 is a distinct, non-trivial (though genuinely
free-source, no-paywall) data-acquisition project of its own, separate from either dataset's
own scoring logic.

---

## 4. Realistic data-store size at scale

**Baseline, measured directly from the current build** (`public/data.sqlite`, inspected with
`sqlite3`'s `dbstat`, not estimated):

- **168 cities, 4 datasets (allergy, crime, care-access + the `cities` table itself), 6,598
  `layer_values` rows → 1,134,592 bytes (1.08 MiB) total file.**
- `layer_values` (the fact table) + its two indexes account for **1,077,248 bytes — 95% of
  the file** (540,672 table + 307,200 unique-index + 229,376 lookup-index). Everything else
  (`cities`, `datasets`, `layers`, `dataset_years`, schema) is ~57 KB combined.
- Per-row cost, including index overhead: **~163 bytes/`layer_values` row**
  (1,077,248 ÷ 6,598). Per-row cost of the `cities` table itself: **~97.5 bytes/row**
  (16,384 ÷ 168), including its own two indexes.
- Row breakdown by dataset (queried directly): **allergy 4,872** (168 cities × 29 layers —
  grass + every allergen in `allergens.json`, no time dimension), **crime 1,222** (matches
  `crime.json`'s own `coverage_by_year` sum exactly: (81+111+129+144+146) × 2 layers),
  **care-access 504** (168 × 3 layers, no time dimension).

**Extrapolation to Census-cluster expansion (~19,500 places):** using the measured
~163 bytes/row marginal cost, and a working assumption of **5–7 Census-cluster layers**
per place (population growth/PEP possibly carrying a short multi-year trend, ~5 rows;
income, broadband, property tax, sales tax, housing inventory each 1 row/place as
single-snapshot layers — **~9–11 `layer_values` rows/place** is a reasonable working range,
not a precise count since none of these are built yet):

| Scenario | Rows | Est. size (layer_values only) | Plus `cities` table @19.5k rows | Rough total |
|---|---:|---:|---:|---:|
| Low (5 Census layers, mostly single-snapshot) | ~97,500 | ~15.9 MB | ~1.9 MB | **~18 MB** |
| High (7 Census layers incl. a multi-year population trend) | ~214,500 | ~35.0 MB | ~1.9 MB | **~37 MB** |

**Keeping crime/care-access/allergy at a smaller curated set costs comparatively little:**
scaling the *current* dataset mix (39.3 rows/city blended average: 6,598 ÷ 168) from 168 to
the pending 511-city candidate spine (`cities-500-candidate.json`) would add roughly
(511−168) × 39.3 × 163 bytes ≈ **2.2 MB** — a rounding error next to the Census-cluster
number above. Even a hypothetical crime-only expansion to a few thousand real
NIBRS-matched municipal agencies (see §2's open question) at crime's current ~7.3
rows/city (1,222 ÷ 168) would add only single-digit MB per thousand cities.

**Conclusion: the Census cluster, not crime/care-access/allergy, is what actually threatens
data-store size** — it's ~40–100× more places, and even at a conservative per-place layer
count, dominates the total by an order of magnitude over anything the other three datasets
could add even at their own maximum plausible ceilings.

**sql.js / WASM practical size ceiling:** the sql.js WASM binary itself is a **fixed ~1.5 MB
cost on every page load, independent of database size** (confirmed:
[sqlite/sqlite-wasm#55](https://github.com/sqlite/sqlite-wasm/issues/55), already the
current architecture per `design-note.md`). The *engine* has real headroom well past what
this project would ever need — community reports cite in-memory `sql.js`/wasm-sqlite3
datasets in the **100–300 MB range** working before browser memory pressure becomes a
problem, and IndexedDB (irrelevant here, since this project doesn't persist client-side —
`design-note.md` explicitly rejected OPFS/persistent storage as unneeded for a read-only
workload) caps around 125 MB per key on Chrome/Windows regardless. **None of these engine
ceilings are the real constraint for Mapstack.** The real constraint is plain HTTP transfer
+ first-load UX: a 1.1 MB file today loads effectively instantly on any connection; a
**30–40 MB file is a qualitatively different page-weight class** — at a realistic mobile/
mid-tier broadband rate (~10 Mbps), a 37 MB file alone is **~30 seconds** of transfer before
sql.js can even open it, on top of the existing 1.5 MB WASM fetch. That's a real, material
regression from "loads instantly" to "the map is blank for tens of seconds," even though
sql.js itself would handle a database that size without complaint once loaded. `design-note.md`
already anticipated exactly this growth path and named the fix:
[`sql.js-httpvfs`](https://github.com/phiresky/sql.js-httpvfs) (same engine, HTTP
Range-request paging instead of eager full-file fetch) — noted there as "not needed at
current scale," which this research confirms is no longer true once Census-cluster
expansion happens.

---

## 5. Recommendation

**Per-dataset ceiling, concretely:**

| Dataset | Real ceiling | Recommended default target |
|---|---|---|
| Census cluster (population, income, broadband, property tax, sales tax, housing inventory) | ~19,500 incorporated places (ACS5's actual no-population-floor design) | **Extend to full ~19,500** — this is genuinely the ceiling the operator's "entirety of whatever complete datasource" direction describes, and per §4 it's the affordable part of the expansion in relative terms (it's the big absolute number, but it's also the one dataset cluster whose *source* actually reaches that far) |
| Crime (NIBRS) | 14,601 NIBRS-reporting agencies nationally (87.2% pop. coverage, 2024) — but the real matched-to-incorporated-place count is smaller and **not yet empirically known** (see §2) | **Run the existing agency-matching script (`fetch_crime_agencies.py`'s method) against the full ~19,500-place candidate list to find the real number** before committing to a target — do not extend crime to "19,500 places," extend it to "every place that has a real matched NIBRS agency," whatever that empirically turns out to be |
| Care access, allergy severity | Not source-limited; compute is trivial (§3) — but genuinely gated by how far the **geographic spine itself** (lat/lon/elevation/Köppen/coastal) is extended, which is a real, separate ~56×-bigger-than-the-344-city-pass data-acquisition project | **Extend alongside whatever the spine itself grows to** (511 now; 19,500 only once/if the spine's own lat/lon/elevation/Köppen/coastal fields are populated that far, including replacing the hand-guessed `coastal` flag with a real coastline dataset before doing so at that scale) |

**Resulting total data-store size, full Census-place resolution:** roughly **18–37 MB**
(§4's low/high scenario), dominated almost entirely by the Census cluster; crime/care-access/
allergy staying at their own real (much smaller) ceilings adds only low single-digit MB on
top of that.

**Same file vs. lazy-loaded chunk — recommendation: split it.** Ship the **curated
default-N set (likely ~500, per the pending `cities-500-candidate.json` work) plus every
non-Census dataset at whatever their own real ceiling is** in the eagerly-fetched
`data.sqlite` — that keeps the default, first-paint experience at roughly today's ~1–3 MB
class, no perceptible regression. Ship the **long tail of the Census cluster (places outside
the default ~500) as a separately-fetched chunk**, loaded only when search/drill-down
actually resolves to a place outside the default set — exactly the trigger condition
`full-resolution-spine-decision.md` itself describes ("search/selection can reach the FULL
dataset"). Two concrete implementation paths worth evaluating at build time (not decided
here — an implementation-phase choice): (a) a second static `data-full.sqlite` file fetched
in full on first drill-down outside the default set (simpler, but still an all-or-nothing
~15–35 MB fetch once triggered), or (b) `sql.js-httpvfs` (already identified as the named
growth path in `design-note.md`) to page in only the specific rows a search hit needs via
HTTP Range requests, never fetching the full long-tail file even once. (b) is the more
scalable answer if the Census cluster grows further (more backlog datasets added later), but
carries its own setup cost (chunked/paged file format, byte-range-capable static hosting —
worth confirming Vercel's static asset serving supports Range requests before committing);
(a) is the faster near-term path and may be sufficient if the long-tail chunk stays in the
15–35 MB range this research estimates. Either way: **never ship the full ~19,500-place
Census tail in the same eagerly-loaded file the default map view fetches on every visit.**
