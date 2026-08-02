# Grill Record — power-user-tab

**Source draft:** .pHive/epics/power-user-tab/docs/design-discussion.md
**CONTEXT.md substrate:** present
**inconsistency_risk_signals:** present (via research-brief.md Risks/Constraints, sourced from researcher's raw INCONSISTENCY_RISK_SIGNALS)
**round_number:** 1
**unresolved_count:** 5
**Generated:** 2026-08-02

## Summary

- Vocabulary mismatches: 1 finding
- Hidden assumptions: 2 findings
- Unresolved tensions: 1 finding
- Convention violations: clean
- Posture mismatches: 1 finding

## Vocabulary mismatches

- **V1** — "comparison table" (draft §3.2) is a new UI concept that overlaps
  with, but never reconciles against, CONTEXT.md's existing "Multi-layer
  stacking" term ("rendering 2+ dataset layers simultaneously with per-layer
  color identity"). A reader familiar with CONTEXT.md's vocabulary would
  reasonably ask whether the power-user tab's comparison table IS multi-layer
  stacking rendered as a table, or a genuinely separate concept.
  - Draft location: §3.2 ("Build a `PowerUserPanel` component...renders a
    per-city comparison table/list")
  - Reference: `.pHive/CONTEXT.md` § Terminology, "Multi-layer stacking"
  - Question for planner: Is the comparison table a new view of the same
    stacking concept, or a distinct concept that should get its own
    CONTEXT.md entry once this epic lands?

## Hidden assumptions

- **H1** — Draft asserts (open question 2 and §3.1) that a separate Next.js
  route would "complicate the basePath multi-zone setup," without citing
  evidence. `next.config.ts` shows `basePath: "/mapstack"` is a single global
  config value — every route in the app already inherits the prefix
  automatically; adding `/mapstack/advanced` costs nothing extra versus the
  existing single route. This assumption appears to be **incorrect**, not
  just unverified.
  - Draft location: §3.1 ("I'd lean toward client-side state...since there's
    no routing precedent...and a route split would complicate the static
    export / basePath setup")
  - Why this matters: if the stated rationale for choosing client-side
    tab-state over a real route is wrong, the recommendation itself may be
    wrong — a dedicated route (`/mapstack/advanced`) could be simpler
    (independent code-splitting, natural browser back/forward, bookmarkable)
    than building a bespoke tab-switch inside `MapstackApp`.
  - Question for planner: Re-evaluate the tab-mechanism choice now that the
    basePath objection doesn't hold — does a real route change the approach
    in §3?

- **H2** — Draft assumes (§3.1) that keeping simple-view and power-user-view
  state fully independent is "simpler now," without evidence for whether a
  user switching tabs would expect their current city selection or active
  year to carry over.
  - Draft location: §3.1 ("keep the simple view and power-user view as
    siblings with independent state, since they have different selection
    models")
  - Why this matters: if a user picks a city in the simple view, switches to
    the power-user tab, and loses that selection, that could read as broken
    rather than intentional — this is a UX assumption made without a UX
    rationale beyond implementation convenience.
  - Question for planner: Should `selectedCityId` (at minimum) be shared
    across tabs, or is fully independent state an explicit, justified choice?

## Unresolved tensions

- **U1** — The draft's own §2 and §4 (High risk) establish that dataset
  scores are NOT on a common statistical basis (crime = year-scoped
  percentile rank; allergy = climate-modeled score). §3.2-3.3 then proposes
  building a "transparent ranking mode" — an average of exactly those
  incommensurate values — and §4's stated mitigation is presentational
  (surface the methodology note "as a column header, not a footnote"). That
  mitigation labels the problem; it does not resolve the underlying
  statistical issue that averaging a percentile-rank with a climate-model
  score produces a number whose meaning is genuinely unclear, no matter how
  visibly it's labeled.
  - Draft location: §2 ("the 0-100 scores are not actually on a common
    statistical basis today"); §3.2-3.3 (ranking/shortlist proposal); §4
    High risk (labeling as mitigation)
  - Tension: "ship a transparent combined ranking" vs. "the combination
    itself may not be a coherent number regardless of labeling"
  - Question for planner: Does v1 actually need a *combined* ranked score,
    or would a v1 that lets the user sort by any *one* selected criterion at
    a time (no cross-dataset averaging) satisfy "shortlist cities" without
    reintroducing the incommensurability problem the draft itself flags as
    high risk?

## Convention violations

Clean — no findings. The proposed shortlist module stays outside the
`Dataset` interface (per CONTEXT.md's "a dataset is a wrapper, not a
rewrite" convention), and the design doesn't touch the interface's
`methodologyUrl` requirement for vetted datasets.

## Posture mismatches

- **P1** — The project's own stated principle (README, echoed in
  `.pHive/CONTEXT.md` Conventions) is "gradients, not buckets...never state
  fills or a single scary headline number." A ranked shortlist — even with a
  transparent, user-adjustable formula — inherently produces an ordinal
  "city #1, city #2..." framing, which is structurally the same shape as the
  "single scary headline number" posture the project explicitly avoids
  elsewhere in the product.
  - Draft location: §3.2-3.3 (ranking/shortlist proposal); §1 ("build
    short-lists/ratings of cities")
  - Posture reference: README "Principles" section; `.pHive/CONTEXT.md` §
    Conventions ("Gradients, not buckets...never state fills or a single
    scary headline number")
  - Question for planner: Is a ranked list a deliberate, justified departure
    from that posture for the power-user surface specifically (power users
    opted into more analytical framing), or should ranking be softened
    (e.g., a sortable table with visible per-criterion values, no single
    composite "score" presented as the headline)?

## Notes

The strongest signal across all five categories is the same underlying
tension (U1/P1 are two faces of it): the draft wants a shortlist/ranking
feature, but the codebase's own current data doesn't support a defensible
combined score, and combining anyway risks violating the project's stated
anti-black-box and anti-headline-number posture at once. This is worth
resolving explicitly at the user sign-off gate (§6 open questions), not
deferred to implementation.

## Out of scope (this pass)

Grill does not propose solutions, score quality, gate work, or prioritize
findings. Each finding above ends with a question for the planner.
