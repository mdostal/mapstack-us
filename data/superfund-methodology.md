# Superfund site density — methodology

The thirty-fourth real Mapstack dataset (ddr5-1, `data-drive-round-5` epic).
Resolves a lead deferred since `dataset-verification-drive`'s addendum.

## What this measures

One layer, **Superfund site density**, 0–100. Raw input is the real count of EPA
Superfund sites with `npl_status_code = 'F'` (Final NPL — the currently-active
National Priorities List status, EPA's real designation for the nation's most
serious contaminated sites) within each city's county. A count has no natural
100-point ceiling, so this uses a direct rescale capped at a data-informed ceiling
(see the real observed distribution below), higher count = more concerning.

## Data source

[EPA Envirofacts](https://www.epa.gov/enviro/envirofacts-data-service-api), the
SEMS (Superfund Enterprise Management System) program, `sems.envirofacts_site`
table. Free, no API key.

## Method — a real detour worth documenting

This exact dataset was deferred **three separate times** earlier this session
(see `.pHive/epics/data-store/docs/dataset-backlog.md`'s addenda) — every attempt
guessed at Envirofacts table names against the legacy `efservice` endpoint
(`SEMS_SITE`, `SEMS_ACTIVE_SITES`, `CERCLIS`, and others), all failing with the
API's own real "table not available" error.

The real fix, found the same way `hate-crime.ts`'s equally-long-deferred lead was
resolved in the prior epic: reading EPA's own Envirofacts API documentation page
(`epa.gov/enviro/envirofacts-data-service-api`) directly, this time via a browser
rather than plain `curl` (the page itself loads fine unrendered, but its content
was never actually read in prior attempts — only table names were guessed against
the wrong base URL). Two real findings the prior three attempts missed entirely:

1. **A newer API base** — `data.epa.gov/dmapservice/...`, distinct from the legacy
   `efservice` base every earlier attempt used exclusively.
2. **Table names require a program prefix** — the real table is
   `sems.envirofacts_site`, not a bare `SEMS_SITE`/`SEMS_ACTIVE_SITES`. Every
   earlier guess omitted this required prefix.

Confirmed live: `.../sems.envirofacts_site/fk_ref_state_code/equals/NJ` returns
2,216 real NJ site records in under a second, each carrying a real county
`fips_code` — reuses the existing `city-county-fips.json` crosswalk directly, a
much cleaner join than the name-based one this same round's abandoned
drinking-water attempt needed.

1. One request per state (all 51 states + DC), each cached.
2. Filter to `npl_status_code = 'F'` (Final NPL) — the vast majority of records in
   this table are `N` (assessed, not listed) or historical statuses; counting
   those would conflate "EPA looked into it" with "this is an active
   contamination site."
3. Count Final NPL sites per real county `fips_code`, join to the spine via the
   existing crosswalk.

## Known limitations (shown, not smoothed over)

- **512/512 real coverage** — every spine city resolves to a real county via the
  existing crosswalk, so every city gets a real count (zero is a real, valid
  count, not a missing value).
- **County-level, not site-proximity** — a large county with one Superfund site
  in a far corner scores the same as a small county with a site downtown; a
  future pass could add a real distance-based layer using each site's real lat/
  lon (present in the source data, though sparsely populated).
- **A snapshot of Final NPL status only** — sites can move between NPL statuses
  over time (proposed → final → deleted after cleanup); this dataset doesn't
  track that history, `supportsTime: false`.
- **Some records have a null `fips_code`** — a real, partial gap in the source
  data itself; those records are skipped, not guessed at.

## Reproducing this dataset

```
python3 scripts/gen_superfund_data.py
```

No API key required. Requires `data/raw/city-county-fips.json` to already exist.
Caches each state's response under `data/raw/superfund-cache/` (gitignored — pure
fetch-scratch, safe to delete and re-fetch any time; retries transient network
timeouts with backoff). Writes `data/superfund.json`.
