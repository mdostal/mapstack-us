# Research brief — data-drive-round-6

## USGS seismic design values (real, working, picked)

`earthquake.usgs.gov/ws/designmaps/asce7-22.json` -- confirmed live, no API key,
takes lat/lon directly (no crosswalk needed at all -- `data/cities.json` already
has real lat/lon per city). Returns real, standard structural-engineering seismic
design parameters used in actual building codes, including `sds` (Design Spectral
Response Acceleration, short period) and `sdc` (Seismic Design Category, a real
A-F classification). Confirmed live differentiation: Los Angeles `sds=1.51,
sdc=D`; San Francisco `sds=1.17, sdc=D`; New York City `sds=0.2, sdc=B` --
matches real-world seismic knowledge. ~0.8s/request, ~7 minutes for the full
512-city spine. `siteClass=D` (stiff soil) used as the standard ASCE 7 default
when site-specific geotechnical data isn't available -- the same convention real
engineering practice uses absent a site-specific soil study.

This is a genuinely different hazard angle from `hazard.ts`'s existing FEMA
National Risk Index layers (flood, wildfire) -- earthquake risk isn't currently
represented anywhere in this project.

## Other candidates from the prior round's plan, not pursued this round

HUD Fair Market Rents (still needs a new registration key -- not pursued, no user
action requested this round), DOT/FHWA AADT (not re-attempted), CDC WONDER and
NCES libraries (not attempted) -- USGS seismic was strong enough on first check
that this round's research budget went to building it properly rather than
spreading across more candidates.

## Pick for this round

**USGS seismic design values (earthquake risk)** -- real, live-verified, keyless,
zero crosswalk needed (direct lat/lon), genuinely new hazard category.
