# Electoral competitiveness — methodology

The fifteenth real Mapstack dataset, and the one dataset in this project's own research
backlog flagged as genuinely sensitive for a public site — built only after explicit
operator sign-off on both the decision to build it at all and the specific framing below,
not shipped autonomously the way most datasets in this project were.

## What this measures, and what it deliberately does NOT measure

**This is not a left/right "political lean" score.** Deciding that one party's dominance
counts as "more concerning" than the other's would be an editorial, partisan judgment this
project has no basis to make — and making it anyway risks the map itself reading as taking
a side, which runs directly against this project's "no black boxes, no claimed precision
beyond what the data supports" posture.

Instead, this measures **electoral competitiveness** — one layer, 0–100, from the real
margin of victory in each county's 2024 presidential vote: `|winner votes − runner-up
votes| ÷ total votes × 100`. Higher margin (a bigger blowout, in **either** direction) is
scored as **more concerning** — the reasoning being that competitive elections are what
keep officials accountable to voters; a genuinely uncontested race is the concerning case
here, regardless of which party wins it.

## Data source

[MIT Election Data + Science Lab (MEDSL)](https://electionlab.mit.edu/), "County
Presidential Election Returns 2000-2024" — the authoritative academic compilation of
official county-certified election results, [hosted on Harvard
Dataverse](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/VOQCHQ)
(`doi:10.7910/DVN/VOQCHQ`), CC0 (public domain) licensed.

**A real access limitation, confirmed directly, not assumed**: this file requires a
one-time Dataverse "guestbook" response (name/email/institution) before any download —
completed by the operator via the browser, which worked. But even afterward, WITH a valid
Dataverse API token, the programmatic `/api/access/datafile` endpoint still rejected the
request with the identical guestbook error (`HTTP 400`). The browser-side guestbook
completion does not appear to propagate to token-based API access on this Dataverse
instance. So — unlike every other dataset in this project — this one cannot be reproduced
by a fresh, keyless (or key-only) script run. The 2024 rows (trimmed from the full
2000–2024 file for size) are committed directly at `data/raw/countypres_2024.csv` instead,
which the CC0 license permits without restriction.

## Method

1. **County crosswalk**: each spine city's county FIPS is read directly from
   `data/raw/city-county-fips.json`, already built by `geocode_city_counties.py` for the
   hazard dataset — no new geocoding.
2. **Margin computation** (`scripts/gen_political_lean_data.py`): MEDSL's file reports one
   row per candidate per county, with a real reporting quirk handled explicitly — some
   states report an aggregate `mode: "TOTAL"` row per candidate alongside separate
   early/mail/provisional breakdown rows for the same candidate (using only the `TOTAL`
   row avoids double-counting); some states use a blank `mode` for their aggregate instead;
   a small number of counties (confirmed: South Dakota) report only a single non-aggregate
   mode, safely summable since there's no risk of double-counting when only one mode
   exists. The top two candidates by vote count (not assumed to always be the Democratic
   and Republican nominees) determine the real margin.

## Known limitations (shown, not smoothed over)

- **County-level, not city-level** — the same "one number per county" blur
  `hazard-methodology.md`/`traffic-fatalities-methodology.md`/`svi-methodology.md` all
  carry, worth extra emphasis here specifically: a county's aggregate 2024 margin can
  differ sharply from a city's own actual electorate, especially for a city that's a small
  fraction of a larger, more rural (or more urban) county.
- **7 of 512 spine cities have no match — all in Connecticut** (Bridgeport, Stamford, New
  Haven, Hartford, Waterbury, Norwalk, Danbury). A real, confirmed geography-vintage
  mismatch, not a join bug: Connecticut eliminated its 8 legacy counties as governmental
  units in 2022, replacing them with 9 planning regions. This project's existing county
  crosswalk (built for the hazard dataset, before this one) already resolves Connecticut
  cities to the NEW planning-region FIPS codes, while MEDSL's 2024 election file still
  reports Connecticut results under the OLD legacy county FIPS codes — two real, current
  data sources using two different real geographies for the same state, with no reliable
  1:1 remap between them (the boundaries don't fully correspond; the new Naugatuck Valley
  region, for example, was carved from parts of two old counties). Left honestly null
  rather than guessed.
- **A single election year (2024), not a real multi-year trend** (`supportsTime: false`) —
  MEDSL's source data goes back to 2000; only the most recent presidential cycle is
  surfaced here.
- **Presidential-only** — down-ballot competitiveness (Senate, House, state/local races)
  can differ substantially from presidential-year margins in the same county; not
  represented here.
- **"Winner"/"runner-up" are the top two candidates by raw vote count**, not assumed to be
  the Democratic and Republican nominees specifically — a real, if rare, third-party or
  independent strong showing would be reflected accurately rather than forced into a
  two-party frame.

## Reproducing this dataset

```
python3 scripts/gen_political_lean_data.py
```

Reads the committed `data/raw/countypres_2024.csv` (see the access-limitation note above
for why this file is committed rather than fetched fresh) and
`data/raw/city-county-fips.json`. Writes `data/political-lean.json`.
