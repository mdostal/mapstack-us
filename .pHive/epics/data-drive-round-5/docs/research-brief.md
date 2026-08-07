# Research brief — data-drive-round-5

## EPA Superfund/NPL: resolved, real, working (fourth attempt, docs-rendering technique)

Applied the same technique that resolved FBI hate crime in round 4: instead of
guessing Envirofacts table names against the legacy `efservice` endpoint (which
failed three separate times across dvd-6, ddr3, and earlier), read EPA's own
Envirofacts API documentation page
(`epa.gov/enviro/envirofacts-data-service-api`) directly via Playwright.

Two real findings the prior three attempts missed entirely:

1. **A newer API base** (`data.epa.gov/dmapservice/...`), distinct from the legacy
   `efservice` base every prior attempt used exclusively.
2. **Table names require a program prefix** -- `sems.envirofacts_site`, not
   `SEMS_SITE`/`SEMS_ACTIVE_SITES`/`CERCLIS`/etc. Every prior guess omitted the
   required `sems.` prefix, which is why they all failed with "table not
   available" even though `envirofacts_site` alone might have been close.

Confirmed live: `.../sems.envirofacts_site/fk_ref_state_code/equals/NJ` returns
2,216 real NJ site records in under a second, each with a real county `fips_code`
(reuses the existing `city-county-fips.json` crosswalk directly -- no new
geocoding, unlike the failed drinking-water attempt) and a real `npl_status_code`
(`F` = Final NPL, the actual currently-active Superfund site status; `N` = not on
NPL; `D` = deleted/cleaned up; confirmed real distribution: 115 Final NPL sites
among NJ's 2,216 total assessed sites). California (largest state, 4,078 records)
fetched in 4.4 seconds.

## Pick for this round

**EPA Superfund/NPL site density** -- real, live-verified, keyless, reuses the
existing county crosswalk, resolves a lead deferred across four prior mentions.
