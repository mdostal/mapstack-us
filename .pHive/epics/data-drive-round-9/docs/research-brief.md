# Research brief — data-drive-round-9

## FCC National Broadband Map -- broadband speed availability (real, working, picked)

`broadbandmap.fcc.gov`'s public data-download page (`/data-download/nationwide-
data`), confirmed live via a real browser session (not a guessable static URL --
the underlying download endpoint, `nbm/map/api/getNBMDataDownloadFile/{fileId}/
{n}`, requires first resolving the current filing ID and file ID through the
site's own config/filing APIs, which change with each FCC data release). Real
file downloaded via the site's own "Download zipped Fixed Broadband Summary by
Geography Type" button: `bdc_us_fixed_broadband_summary_by_geography_D25_
04aug2026.csv`, 90MB, 616,171 rows.

Real, clean county join confirmed directly: `geography_id` for `geography_type=
County` rows is the exact 5-digit county FIPS (e.g. `01001` = Autauga County,
AL) -- reuses the existing `city-county-fips.json` crosswalk directly. 3,232
unique real counties present, `speed_100_20` column = real % of locations with
access to the FCC's current official broadband standard (100 Mbps down / 20
Mbps up, the threshold FCC itself uses as of its most recent standard update).

This is a genuinely different angle from the already-shipped `broadband.ts`
(Census ACS broadband **subscription** rate -- do households actually pay for
service) -- this measures broadband **availability** (can a location get
service at all, regardless of whether anyone there subscribes), a real,
distinct rural/urban infrastructure-access signal.

**A real, disclosed limitation**: unlike every other bulk-download dataset
this session, this file's download URL is not a stable, guessable static path
-- it requires the site's own versioned filing/file-ID discovery dance.
Documented explicitly in the methodology doc as a real reproducibility
caveat, with the already-downloaded file cached in the repo's raw-data cache
(same posture every other dataset uses, just with a manual-refresh note for
this one specifically).

## Pick for this round

**FCC broadband speed availability** -- real, live-verified, reuses the
existing county crosswalk, a genuinely distinct signal from the already-shipped
ACS subscription-rate dataset.
