# Decision: full-resolution data store, curated default rendering

Operator direction (2026-08-03), verbatim: "We should let the users pick and
choose, we can DEFAULT to the tops, but we should still use the entirety of
whatever complete datasource we can find -- meaning as detailed as we have
even if we need to load a much more dense db in and do some extrapolation
for speed and then allow you to dig in for granularity."

## What this changes vs. the top-500-candidate work

The `cities-500-candidate.json` research (previous pass) treated 500 as a
hard cutoff — a single spine every dataset joins against, replacing the
current 168. That's now superseded: there is no fixed spine size. Instead:

- **The data store holds every place a real source can honestly provide**,
  not a curated subset — bounded only by what each source actually covers
  (which varies a lot per dataset; see the research this triggers below).
- **The default rendered view (map/table) shows a curated top-N** (likely
  ~500, still TBD) for performance and a clean first impression — the
  existing IDW heatmap interpolation (`src/lib/heatmap/`) already
  extrapolates a continuous surface from a sparse point set, so a denser
  real point set underneath it directly improves that surface's accuracy
  without changing the interpolation approach itself.
- **Search/selection can reach the FULL dataset**, not just the default
  top-N — e.g. a small town outside the default set should still be
  findable and show its own real values, not just an interpolated guess.

This does NOT mean forcing a specific cutoff decision (like the earlier
Grand Junction question) — a place either has real source data and is in
the full store, or it doesn't. The "top 500" (or whatever number) becomes
a rendering/performance default, not a data-inclusion boundary.

## Open question this triggers, before any implementation

Every dataset has a genuinely DIFFERENT real ceiling on "as complete as
possible":
- Census-sourced datasets (population, income, broadband, housing,
  property tax, sales tax) are computed from Census APIs that cover
  essentially all ~19,500 incorporated U.S. places -- likely the widest
  realistic ceiling.
- Crime (FBI NIBRS) is capped by which law-enforcement agencies actually
  report -- a real, much smaller number than "every town," not a data
  format limitation.
- Care access (drive-time) and allergy severity (climate-parametric
  formula) are computable for ANY lat/lon, not source-limited at all --
  the ceiling there is purely "how many points do we choose to compute
  for," bounded by build time and final data-store size, not by data
  availability.

Research launched to scope the real numbers per dataset (agency counts,
API coverage, realistic SQLite size at various place counts) before
proposing a concrete schema -- see the research doc this produces.
