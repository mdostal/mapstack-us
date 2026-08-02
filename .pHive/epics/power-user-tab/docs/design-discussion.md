# Design Discussion: Advanced Power-User Tab

## §0 Prelude

**NORTH STAR** (from `.pHive/project-profile.yaml`, captured at kickoff):
- Goal: Generalized US map-layer engine — pick datasets, overlay them, find what matters to you.
- Audience: Mixed — general public + a planned advanced/power-user tab, open source for anyone.
- Scale: Small/personal-scale, cost ≈ $0.
- Pain points: None currently (greenfield in spirit) — no existing tool provides these overlays anywhere.

No PRIOR DECISIONS found in the knowledge graph for this topic — clean slate.

## 1. What Are We Doing?

We're adding a second UI surface to mapstack-us — an "advanced" or "power-user"
tab, distinct from the existing simple picker-and-map view aimed at the general
public. The operator's stated success criteria (from kickoff's north_star) are
broad: correctly correlate data across datasets, chat with an agent, import your
own data, build shortlists/ratings of cities across unrelated segments, and
export data/analysis. That's a multi-epic roadmap, not one tab.

This epic scopes the *first real slice* of that roadmap: a power-user tab that
lets someone view 2+ datasets side by side for a city (or a set of cities) with
each dataset's scoring basis made explicit, sort/shortlist cities by any single
selected criterion, and save/restore their picks across sessions — without
manufacturing a cross-dataset combined score the data doesn't actually support
(see the revision note at the end of §3 — this was corrected after the
adversarial grill pass; grill-record: `grill-record.md` finding U1). Chat-with-
data, CSV import, and a feedback/comments system are real asks but are
explicitly **not** in this epic (see §6 open questions and the deferred list
in §8).

Done looks like: a `/mapstack/advanced` route where a user can select 2+
dataset/layer combinations, see them side-by-side per city with a visible
per-dataset methodology note, sort a city list by any one selected criterion
at a time, and have that selection persist across a reload — built entirely
client-side, consistent with the rest of the app.

## 2. What I Found

The codebase today is genuinely single-mode: `src/components/MapstackApp.tsx`
holds all state (`active` layers, `year`, `selectedCityId`) in one component's
`useState` — no context, no router, no tab primitive anywhere (confirmed by
grep — zero `Tab`/`mode` hits). A "tab" is a green-field UI concept here, not an
extension of something existing.

The `Dataset` interface (`src/lib/datasets/types.ts`) looks correlation-ready —
every dataset returns a shared 0-100 "higher = more concerning" value
specifically so one color ramp works everywhere — but the interface's own doc
comment references a `combineDatasetValues` cross-dataset combination helper as
if it already exists ("the narrow slice of that already built"). It doesn't; a
full grep confirms zero implementation. That comment is aspirational, not
descriptive, and it's the single most important thing this design has to get
right: **the 0-100 scores are not actually on a common statistical basis today.**
Crime's score is a percentile rank scoped to one year's covered cities
(`crime.ts` explicitly warns it isn't even comparable across its own years);
allergy's is a climate-modeled score. Building a shortlist/correlation feature
directly on raw `getValue()` outputs, without surfacing that difference, would
be exactly the "black-box heuristic" the operator told us to avoid at kickoff.

`src/lib/active-layers.ts` is the only existing cross-dataset-aware plumbing
(`ActiveLayer`, `resolveActiveLayer`, `isSameLayer`), but it only supports
independently-stacked rendering — not joint querying. `registry.ts`'s flat
`DATASETS` array is the natural enumeration point for a shortlist UI that needs
to reason across all datasets at once.

The sibling project allergy-locator (already Hive-enabled, this repo's origin)
already shipped exactly the persistence pattern this epic needs: a small,
SSR-safe, fail-open localStorage CRUD module (`src/lib/profiles.ts`) plus a
companion URL-state module that keeps "durable saved state" in localStorage and
"what's on screen right now" (including a 2+-item `compare` view) in URL
params. Neither file is shared code — they're a template to adapt, not a
dependency to import — but they mean this epic doesn't need to invent a
persistence pattern from scratch.

`next.config.ts` sets a single global `basePath: "/mapstack"` for the
tools.mdostal.com multi-zone mount — every route in the app already inherits
that prefix automatically, so adding a second real route costs nothing extra
versus the current single-route app (this corrects an initial draft assumption
— see the grill-record finding H1).

The project's own stated principle (README, echoed in `.pHive/CONTEXT.md`
Conventions) is "gradients, not buckets...never state fills or a single scary
headline number." That principle constrains how any city-ranking UI in this
epic should present results — a single composite "score" ranking would read as
exactly the kind of headline number the project avoids elsewhere (grill-record
finding P1); see the revised §3 approach below.

## 3. My Proposed Approach

1. **Add a real route: `src/app/advanced/page.tsx`.** Since `basePath` already
   makes this cost-free (see §2), a dedicated route beats a client-side tab
   toggle: independent code-splitting, native browser back/forward, a
   bookmarkable/shareable URL. Share both `selectedCityId` and `year` across
   the simple view and this route via URL search params (e.g. `?city=&year=`)
   rather than fully independent state — so picking a city/year in one view
   and following a link to the other doesn't silently lose the selection.
2. **Build a `PowerUserPanel` component** (new, under `src/components/`) that:
   - Lets the user pick 2+ (dataset, layer) pairs via a checkbox list, reusing
     `registry.ts`'s `DATASETS` and the existing `ActiveLayer` shape — follows
     allergy-locator's `ProfileCompare.tsx` interaction shape (checkbox
     multi-select), reviewed per open question 4.
   - Renders a per-city comparison table: each selected (dataset, layer) as its
     own column, with the dataset's methodology note **in the column header**
     (not a footnote), so nothing reads as a single unexplained composite
     number. This is a distinct concept from CONTEXT.md's existing "multi-layer
     stacking" (simultaneous map rendering) — it's a tabular, side-by-side view
     for comparison rather than a rendering technique; worth a follow-up
     CONTEXT.md entry once this epic lands (grill-record finding V1).
   - Lets the user **sort the city list by any one selected (dataset, layer)
     column at a time** — no cross-dataset averaging, no combined "score."
3. **Revision after the grill pass (finding U1):** the original draft of this
   approach proposed a "transparent ranking mode" — a user-weighted average
   across selected criteria. Grill correctly flagged that §2 already
   establishes the underlying scores aren't on a common statistical basis
   (crime = year-scoped percentile rank; allergy = climate-modeled score), so
   averaging them — even with a visible formula — produces a number whose
   meaning isn't actually well-defined, and a labeled-but-still-computed
   composite score is also in tension with the project's "gradients, not
   buckets...never a single scary headline number" posture (grill-record
   finding P1). **Resolution: v1 does not compute any cross-dataset combined
   score.** The power-user tab's "shortlist" capability in this epic is single-
   criterion sort only (point 2 above) — genuinely useful (e.g., "show me every
   city sorted by grass allergy severity, with crime as a second visible
   column") without inventing a number the data doesn't support. True weighted
   combination is deferred to a later epic, contingent on first designing a
   real normalization approach across dataset scoring bases — that's a
   research question in its own right, not a UI feature to bolt on now.
4. **Add `src/lib/power-user/sort.ts`** — single-criterion sort/filter logic
   over the city list, kept separate from `datasets/types.ts` so the core
   `Dataset` interface stays untouched. Deliberately does not contain any
   cross-dataset combination logic, per point 3.
5. **Port the saved-view pattern from allergy-locator.** Add
   `src/lib/saved-views.ts` (adapted from `profiles.ts`) storing
   `{id, name, selections: ActiveLayer[], sortBy, savedAt}` under a
   mapstack-specific localStorage key. Add a companion `src/lib/url-state.ts`
   (adapted) so a saved view is restorable via URL, not just localStorage —
   matching the source pattern's compare-view precedent.
6. **Explicitly punt on data import and chat-with-data.** Both are real
   north-star items but neither has a design answer yet (see open questions
   3-4) and both risk violating the `methodologyUrl`-required convention if
   rushed. I'd rather ship a transparent, real power-user tab now and treat
   import/chat as a follow-up epic once this tab's compare/sort UX proves out.

## 4. What Could Go Wrong

- **Medium — single-column sort still invites an eyeballed "composite" read.**
  Even without computing a combined score, a user looking at 3 sorted columns
  side-by-side may informally average them in their head. This is a real but
  much smaller residual risk than the original (now-removed) computed-score
  approach — the app itself never asserts a false number, it only presents the
  real per-dataset values transparently. No further mitigation planned for v1
  beyond the column-header methodology notes.
- **Medium — scope creep back toward chat/import.** The operator's stated
  success criteria are much bigger than this tab (chat with an agent, CSV
  import, exports). There's a real risk this epic silently balloons trying to
  satisfy all of north_star at once. Mitigation: this design explicitly defers
  those (see §6, §8) — the confirmation gate should hold that line.
- **Medium — new persistence code duplicates rather than reuses.** Since
  allergy-locator's `profiles.ts`/`url-state.ts` aren't shared dependencies,
  porting them means re-solving schema versioning and storage-key naming from
  scratch; a rushed port could introduce bugs the source project already fixed
  (e.g., the fail-open-on-corrupt-JSON behavior is easy to drop by accident).
- **Low — shared `selectedCityId` via URL param adds a small cross-view
  contract.** Both `/` and `/mapstack/advanced` need to agree on the param
  name and format; a mismatch would silently drop the shared selection rather
  than error loudly. Worth a shared constant/helper rather than two
  independently-typed implementations.

## 5. Dependencies and Constraints

- No new external libraries anticipated — this stays within the existing
  Next.js/React/TypeScript/Tailwind stack; localStorage and URL APIs are
  browser-native.
- Must preserve the static-first, zero-runtime-fetch, $0-cost posture — no new
  backend, no new API route.
- Must preserve the `methodologyUrl`-required convention for every *vetted*
  dataset shown in the comparison table (this epic doesn't touch that
  convention — it just doesn't extend it to user-imported data, because
  import isn't in scope here).
- Depends on `src/lib/datasets/registry.ts` and `active-layers.ts` staying
  stable — this epic reads from them, doesn't change their contracts.

## 6. Open Questions — Resolved at User Sign-Off

1. **Resolved: yes, defer both.** CSV import and chat-with-an-agent stay out
   of this epic; each becomes its own future epic once this tab proves out.
2. **Resolved by grill (finding H1):** tab mechanism is a real route
   (`/mapstack/advanced`), not client-side tab state — `basePath` makes this
   free, and a route gets bookmarkability/back-forward for free too.
3. **Resolved by grill (finding U1):** no cross-dataset combined score in v1 —
   single-criterion sort only. Weighted combination is deferred pending a real
   normalization design, not decided here.
4. **Resolved: reviewed.** allergy-locator's `ProfileCompare.tsx` offers
   3 switchable views for comparing 2+ *saved profiles*: "worst-case" (max)
   and "noisy-OR" (both combination math, via `lib/severity/combine-profiles.ts`)
   plus a **"side-by-side"** view that skips combination math entirely. Two
   important takeaways: (a) this validates rather than changes the epic's
   resolution of U1 — allergy-locator's combination math (max/noisy-OR)
   operates over multiple profiles *within one dataset's own consistent
   scoring basis* (allergen severity), which is a fundamentally different,
   legitimate case from combining *across* datasets with incommensurate bases
   (crime percentile vs. climate-modeled score) — it is not precedent for
   cross-dataset combination. (b) the "side-by-side" view (checkbox multi-
   select + a view-switcher `role="tablist"`) is a directly reusable UI
   pattern for this epic's comparison table — worth following its interaction
   shape (checkbox list to pick items, tab-style view switcher) even though
   mapstack's "views" are just "table" (no alternate combination views needed).
5. **Resolved: no, fully deferred.** No feedback/comments mechanism in this
   epic.
6. **Resolved: yes, share `year` too.** Both `selectedCityId` and `year`
   travel via URL params between `/` and `/mapstack/advanced`.

## 7. Verification Strategy

```
VERIFICATION PLAN:
  Tools: Vitest (unit) for sort logic and saved-views storage module;
         Playwright (e2e) for the route navigation + comparison-table flow.
  Platforms: Chromium via existing Playwright config (matches current e2e setup).
  Automated: single-criterion sort correctness (unit), saved-view CRUD
         round-trip incl. corrupt-JSON fail-open behavior (unit), navigate to
         /mapstack/advanced + select 2 layers + see comparison table + sort +
         reload restores saved view + shared city selection survives
         navigating from `/` to the advanced route (e2e).
  Manual: visual check that methodology notes render legibly in the comparison
         table column headers, not buried as a tiny footnote (this is a
         judgment call on presentation, not something a test can assert well).
  Not verifying: cross-browser beyond Chromium (matches existing e2e scope —
         no Safari/Firefox testing exists in this repo today); no load/perf
         testing (static-first, single-user client app, not warranted at
         this scale).
```

## 8. Scale Assessment

```
SCALE ASSESSMENT:
  Files affected: ~7-8 (new route + PowerUserPanel + subcomponents, sort.ts,
    saved-views.ts, url-state.ts, plus tests for each)
  Subsystems: UI (new route + components), a new lib module (single-criterion
    sort), client-side persistence (new — localStorage + URL state)
  Migration required: no
  Cross-team coordination: no (solo project)
  Unknowns: 3 open questions remain after grill resolved 2 of the original 5
    (H1/U1) — mostly UX polish decisions, not structural unknowns

  RECOMMENDATION: Proceed with Horizontal + Vertical planning (Medium scope),
    skip the full Structured Outline.
  RATIONALE: This spans 3 real layers (new UI route, new sort/lib logic, new
    persistence) and should ship as a working thin slice — that's exactly
    what vertical slicing is for. It's not large/multi-system enough (no
    migration, no cross-team, single client-side app, no combined-score
    design question left open) to warrant a full structured outline with
    formal elicitation.
```

**Deferred out of this epic** (explicitly, per §1 and open question 1):
- CSV/user data import as a comparable dataset
- Chat-with-your-data / agent integration
- Feedback/comments mechanism
- Data export
- Cross-dataset weighted/combined ranking (deferred pending a real
  normalization design — see §3 revision note)

## Grill Pass Record

Phase A2 ran one round of adversarial grill against the first draft of this
document. Full findings: `.pHive/epics/power-user-tab/docs/grill-record.md`
(5 findings: V1, H1, H2, U1, P1). Disposition:

- **V1** (comparison table vs. multi-layer-stacking vocabulary) — addressed:
  §3.2 now explicitly distinguishes the two concepts.
- **H1** (basePath route-split assumption was ungrounded/wrong) — addressed:
  §3.1 now uses a real route (`/mapstack/advanced`), confirmed cost-free via
  `next.config.ts`.
- **H2** (independent-state assumption for city selection) — addressed: §3.1
  now shares `selectedCityId` across views via URL param.
- **U1** (transparent-formula mitigation didn't resolve the underlying
  statistical tension) — addressed: §3 revision removes cross-dataset combined
  scoring from v1 entirely; single-criterion sort only.
- **P1** (ranked list vs. "gradients not buckets" posture) — addressed as a
  side effect of the U1 resolution: no composite "score" is presented, only
  transparent per-criterion values and sort.

All five findings were resolved by revising the draft; none required an
accepted-deviation annotation.
