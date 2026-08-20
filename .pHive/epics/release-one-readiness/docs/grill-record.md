# Grill Record — release-one-readiness

**Source draft:** .pHive/epics/release-one-readiness/docs/design-discussion.md
**CONTEXT.md substrate:** present
**inconsistency_risk_signals:** absent (heuristic pass — no research-brief.md exists for this epic; this design-discussion was written retrospectively from a completed body of work, not from a researcher-agent handoff)
**round_number:** 1
**unresolved_count:** 4
**Generated:** 2026-08-20T01:15:00Z

## Summary

- Vocabulary mismatches: clean
- Hidden assumptions: 1 finding (resolved mid-pass, documented for the record)
- Unresolved tensions: 1 finding
- Convention violations: 1 finding
- Posture mismatches: 1 finding (mild, partially self-acknowledged)

## Vocabulary mismatches

None. The draft's use of "concern value," "dataset," "layer," and "methodology doc"
all match CONTEXT.md's own definitions exactly — unsurprising, since the draft's
author (this session) is also the one who most recently touched the `concern`/`score`
terminology directly (task #122, fixing 9 datasets that had drifted from "concern").

One tangential observation, not a finding against the draft: CONTEXT.md itself is
stale — it names "Current datasets: allergy severity, crime, care access" (3 total)
against a live registry of 41. Not the draft's problem to fix, but worth noting since
a future grill pass against a DIFFERENT epic's draft would inherit this same stale
substrate and might not catch it.

## Hidden assumptions

- **H1** — Draft §6 poses Open Questions 1 and 2 ("is there genuine remaining
  dataset-backlog scope?", "are known-issues-backlog.md's items still real?") as
  unresolved, and §8's Scale Assessment recommendation is explicitly conditioned on
  their answers ("proceed to stories only if... finds genuine remaining scope").
  - Draft location: lines under "## 6. Open Questions" (items 1-2) and the
    `RECOMMENDATION` block in §8.
  - Why this matters: a design-discussion that gates its own recommendation on an
    unanswered question isn't actually ready for the scale-assessment decision it's
    making — the doc reads as converged but structurally isn't.
  - Resolution during this grill pass: a parallel investigation (run alongside this
    grill invocation, not by grill itself) answered both. dataset-backlog.md has
    exactly 2 unbuilt candidates left (of 32 ranked), both low-viability (noise
    pollution needs GIS/GDAL tooling not in the stack; household wealth is
    explicitly modeled/imputed data with no geography finer than PUMA). All 4
    substantive known-issues-backlog.md items are confirmed already fixed in
    current code. This resolves H1, but the draft itself should be updated to state
    this as fact rather than leave it as an open question — see U1 below, which is
    the sharper problem this resolution exposes.

## Unresolved tensions

- **U1** — The draft's §8 recommendation logic is binary ("genuine remaining scope
  exists → proceed to stories" / "no scope → ship as-is") but the real finding (per
  H1's resolution) is neither: marginal scope exists (2 candidates) but both are
  low-viability by the project's OWN standards, not just "more effort." The draft
  doesn't define what "genuine" means in a way that handles this middle case.
  - Draft location: §8 `RECOMMENDATION` block, and the underlying tension already
    implicit in listing 2 real-but-weak candidates as if they were a clean yes/no.
  - Tension: "a candidate exists in the backlog doc" vs. "a candidate is actually
    worth building given this project's real constraints (no GIS tooling in the
    stack; a stated real-data-only posture)." The doc conflates these.
  - Question for planner: should the verdict be reframed as "the backlog is
    exhausted of datasets worth building right now" (a stronger, more honest claim
    than "no scope remains") — and should the 2 remaining candidates be explicitly
    struck from active consideration (with reasons on record) rather than left
    dangling as technically-unbuilt?

## Convention violations

- **C1** — One of the 2 remaining dataset-backlog candidates (household
  wealth/net worth, GEOWEALTH-US) is explicitly modeled/imputed data, not a direct
  measurement. This project's own stated posture (`CONTRIBUTING.md`, written this
  session: "Real data only... never a placeholder, a guess, or synthetic filler")
  treats modeled data as a rare, explicitly-disclosed exception (allergy.ts's grass
  severity score is the one precedent, and its methodology doc says so up front).
  - Draft location: not directly discussed in the draft — surfaces via the parallel
    investigation's findings that fed H1/U1, not from the draft's own text.
  - Convention: `CONTRIBUTING.md` "Ground rules" section, first bullet.
  - Question for planner: if this candidate is ever picked up, does it get the same
    explicit "this is a modeled score, not modeled data, and says so" treatment
    allergy.ts got, or does its coarser-than-city geography (PUMA-level, ~100k pop)
    make it a worse fit for this project's per-city UX than allergy's case was? The
    draft should either rule this out explicitly or name the disclosure bar it'd
    need to clear.

## Posture mismatches

- **P1** — The design-discussion template (`hive/references/document-templates/design-discussion.md`)
  is written for a forward-looking plan ("Walk through how you'd implement this,
  step by step" — §3). This draft is retrospective: the work is already done,
  shipped, and CI-verified before the doc was written.
  - Draft location: §3 itself says "Already executed, so this is a retrospective
    rather than a plan" — the draft is self-aware about this, which is why this is
    scored as a mild mismatch rather than a silent one.
  - Posture reference: the template's own framing throughout (present tense
    "would," "propose," future-oriented risk framing).
  - Question for planner: is a retrospective design-discussion the right artifact
    shape for this kind of after-the-fact adversarial check, or would a lighter,
    purpose-built "release verdict" doc (no §3 implementation walkthrough, no §5
    dependencies section — both were near-empty in this draft) better fit what
    grill is actually being asked to stress-test here? Worth deciding before this
    pattern (finish work, then write a retrospective design-discussion just to grill
    it) repeats for a future release checkpoint.

## Notes

The draft's §4 "What Could Go Wrong" section is unusually strong for a
retrospective — every risk is grounded in something actually observed (the CI
chromium-hang pattern, the nanoid override, the un-run cross-browser projects),
not speculative. That's real signal the underlying work was done carefully, not an
artifact of grill finding nothing wrong with the risk section itself.

## Out of scope (this pass)

Grill does not propose solutions, score quality, gate work, or prioritize findings.
Each finding above ends with a question for the planner (in this case, the operator
directing this session) — the next step is either revising the draft to resolve U1/C1/P1
explicitly, or documenting them as accepted deviations before treating this doc as
the release-one verdict.
