# Research Brief: Advanced Power-User Tab

## Summary

Mapstack-us today is a single-mode, single-page app: one `MapstackApp` client
component holding all state (`active` layers, `year`, `selectedCityId`) with no
tabs, routing, or persistence anywhere in the codebase. The `Dataset` interface's
shared 0-100 "concern" scale looks correlation-ready but isn't yet — datasets
compute that score on different bases (crime is a year-scoped percentile rank;
allergy is a climate-modeled score), so naive cross-dataset math would violate the
project's own transparency principle unless the power-user tab makes each
dataset's scoring basis explicit wherever it combines them. The sibling project
allergy-locator already shipped a portable localStorage "saved profile" +
URL-compare pattern that can be adapted rather than built from scratch.

## Key files & surfaces

- `src/components/MapstackApp.tsx` — the entire app shell; single `useState` set,
  no context/reducer/router, no tab/mode primitive. This is where a second tab
  would need to plug in, or fork state from.
- `src/lib/datasets/types.ts` — the `Dataset` interface. Its own doc comment
  references a `combineDatasetValues` cross-dataset combination helper as
  "already built" — it is not; grep confirms zero implementation anywhere.
- `src/lib/datasets/registry.ts` — flat `DATASETS: Dataset[]` array + presumed
  `getDataset(id)`; the natural enumeration point for a shortlist/correlation UI.
- `src/lib/active-layers.ts` — `ActiveLayer {datasetId, layerId}` + helpers
  (`resolveActiveLayer`, `isSameLayer`, `activeLayerKey`); the only existing
  cross-dataset-aware plumbing, and it only supports independent stacked
  rendering, not correlation or combination.
- `src/lib/datasets/crime.ts` — concrete dataset impl showing the percentile-rank
  pattern and its explicit "not comparable across years" caveat.
- `src/components/CityDetailPanel.tsx` — iterates active layers per-city; closest
  existing analog to "show 2+ datasets together," but only for one selected city.
- `/Users/mdostal/Code/allergy-locator/src/lib/profiles.ts` — portable
  `SavedProfile` CRUD-over-localStorage pattern (SSR-safe, fail-open on corrupt
  JSON). Candidate template for "save settings."
- `/Users/mdostal/Code/allergy-locator/src/lib/url-state.ts` — companion pattern:
  durable data in localStorage, "what am I looking at" in URL params, including a
  `compare` param for viewing 2+ saved items together. Candidate template for a
  shareable/restorable shortlist or compare view.

## Patterns & conventions

- **Flat registry, not a plugin system.** Adding a dataset = implement the
  interface + append to `registry.ts`'s array; every dataset-aware component is
  already generic over `DATASETS`.
- **Shared 0-100 "higher = more concerning" scale** exists specifically so one
  color ramp works everywhere — but per-dataset scoring bases differ (see Risks).
- **Static-first, no backend.** Every persistence candidate (save/import/feedback)
  has to be client-only (localStorage) or an external service — there's no API
  route or server in this repo to build on, consistent with allergy-locator.
- **localStorage + URL-param split** (from allergy-locator): durable state lives
  in localStorage; ephemeral "what's on screen" state lives in URL params. This
  is a proven pattern in the sibling project, not yet present here.

## Constraints

- `Dataset.getValue(cityId, layerId, context?)` is single-dataset, single-layer —
  there is no existing entry point for a joint/correlated 2+-dataset query.
  (`src/lib/datasets/types.ts:92`)
- The interface has no slot for user-supplied/ad-hoc data; deciding whether an
  imported CSV becomes a real (in-memory, non-registry) `Dataset` object or a
  separate lighter-weight shape is an open design question.
  (`src/lib/datasets/types.ts:70-93`)
- `methodologyUrl` is a MUST for every dataset per the interface's own doc
  comment — directly in tension with "import your own data," which by definition
  has no methodology doc. (`src/lib/datasets/types.ts:75-78`)
- `MapstackApp` has no context/store/router seam — a second tab means lifting
  state up or forking it; there's no existing extension point.
  (`src/components/MapstackApp.tsx:16-27`)
- Zero routing beyond the root page — a "tab" is most likely client-side state,
  not a new Next.js route, unless the plan deliberately chooses otherwise.

## Risks

- **High — statistical incommensurability.** Crime's score is a year-scoped
  percentile rank; allergy's is a climate-modeled score. A correlation/shortlist
  feature built naively on raw `getValue()` outputs would produce a misleading
  "apples-to-apples" result unless each dataset's scoring basis is surfaced at
  the point of combination. This is the single biggest risk to the "no
  black-box heuristics" principle from kickoff's north_star.
- **Medium — imported-data vs. transparency-convention conflict.** The
  interface's mandatory `methodologyUrl` convention has no answer yet for
  user-imported data with no methodology. Needs an explicit scoping decision
  (e.g., visually/contractually distinct "unvetted" category) before
  implementation, not an implicit shoehorn.
- **Medium — no persistence exists locally yet.** allergy-locator's pattern is a
  reference to adapt, not a shared dependency — porting means re-deciding
  storage-key naming and schema versioning from scratch for mapstack's shape
  (active layers + year + shortlist criteria, not `sensitivities`).
- **Low — no feedback/comments precedent found** in either repo in this pass
  (absence, not a deep-dive-verified gap — flagged as unanswered below).

## Open questions

1. What UI shape is "tab" — a mode toggle inside the existing `MapstackApp`, or
   a separate Next.js route (e.g. `/advanced`)? No precedent exists either way.
2. What does "correctly correlate data" mean well enough to implement without
   becoming a black box — does the power-user tab need a visible per-dataset
   methodology footnote wherever two datasets are combined?
3. Is user-imported data scoped as a first-class `Dataset` (must satisfy the
   full interface, including a user-authored methodology note) or a separate,
   visually-distinguished "your data" category outside the vetted registry?
4. Does allergy-locator's `ProfileCompare`/`ProfileOverlayMap` UI (not read in
   this pass) contain a ranking/scoring pattern worth pulling in beyond the
   storage/URL-state plumbing already reviewed?
5. Is there any existing file-import/CSV-parsing utility in either repo to build
   on, or is that net-new?
6. Is a feedback/comments mechanism in scope for this epic at all, or deferred?

## Recommendation

Treat this as scoping-sensitive: the biggest risk isn't UI complexity, it's
building a correlation/shortlist feature on the current scores without
addressing the statistical-incommensurability and imported-data-vs-methodology
tensions first. The design discussion should resolve open questions 1-3 and 6
explicitly, likely deferring the more ambitious "chat with an agent" /
full-import capabilities (mentioned in the operator's north_star, not in this
specific request) to a later epic, and scoping this epic to a first real slice:
a power-user tab that at minimum does transparent cross-dataset viewing/ranking
of vetted datasets with saved settings, ported from allergy-locator's
localStorage pattern.
