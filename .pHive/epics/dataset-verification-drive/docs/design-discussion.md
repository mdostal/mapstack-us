# Design discussion — dataset-verification-drive

## 0. Prelude

No `PRIOR DECISIONS` (no `.pHive` knowledge-graph tooling vendored in this
consumer checkout — `hive/lib/kg_why` is part of the plugin-hive package, not this
repo). No `NORTH STAR` block in `.pHive/project-profile.yaml` (project profile
predates that field). Proceeding without either — silent, per the planning skill's
own absence-handling contract.

**Scope note on process fidelity**: this consumer repo (`mapstack-us`) has `.pHive/`
state directories (epics, project-profile, cross-cutting-concerns) but does not
vendor the full `hive/` library (no `hive/lib/`, `hive/workflows/`, no
`task_tracking.adapter` configured, `planning.collaborative_review: false` in
`hive.config.yaml`). This plan therefore runs the real decomposition — research,
design discussion, stories — but skips the infrastructure-dependent mechanics that
require modules not present here (kg emit calls, scope-drift telemetry, tracker
publishing, multi-persona SendMessage dispatch). This mirrors how the two prior
epics in this repo (`data-store`, `power-user-tab`) were actually run. Disclosed
here rather than silently no-op'd.

## 1. Goal

Two related but distinct halves, bundled into one epic because they're both about
raising confidence in the dataset layer rather than adding a new one:

1. **Testbed**: close the gap the research brief found — no automated check
   currently enforces that every dataset in `registry.ts` has its four required
   artifacts (methodology doc, unit test, e2e entry, README bullet), and no single
   command codifies the full manual ship ritual this session has repeated by hand
   ~7 times.
2. **Data drive**: the existing dataset backlog is functionally exhausted for
   medium-confidence candidates (see research brief) — the honest next step is a
   fresh research sweep for new candidates, not mechanically working down an
   already-drained list.

## 2. Proposed approach

**Testbed:**
- A new `tests/dataset-completeness.test.ts` that imports `DATASETS` from
  `registry.ts` and, for every entry, asserts (a) `data/${id}-methodology.md`
  exists on disk, (b) `tests/${id}-dataset.test.ts` exists on disk, (c)
  `tests/e2e/mapstack.spec.ts` contains a string reference to the dataset's
  `label`. This turns "verify all of them" from a one-time manual audit into a
  standing, CI-enforced invariant — any future dataset added to the registry
  without its artifacts fails `pnpm test` immediately.
- A new `scripts/verify-all.sh` (or a `pnpm verify` script composing existing
  `package.json` scripts) that runs the full ritual in the established order:
  `tsc --noEmit` → `lint` → `test` → `test:secrets` → clean build → `playwright
  test`. Codifies tribal knowledge into a single reproducible command; does not
  change any individual step's behavior.
- A coverage-honesty check: for each dataset whose `_meta` (in its `data/*.json`)
  declares a `coverage` count, assert the dataset's own methodology doc mentions
  that exact number. Catches the specific failure mode this session already hit
  once for real (the AirNow rate-limit bug silently mis-stating coverage) — this
  time as a standing regression test, not a one-off manual catch.

**Data drive:**
- A research-only story: re-run a fresh candidate sweep (real free/keyed US
  government or well-established nonprofit data sources not already in
  `dataset-backlog.md`), append findings to that same backlog doc with the same
  ranking rubric it already uses, explicitly distinct from the struck-out/weak
  items already there.
- A conditional build story: if the research sweep surfaces at least one real,
  medium-confidence candidate, build and ship it following the exact same
  wrapper pattern as the other 27. If it doesn't, the story's acceptance
  criterion is the updated backlog doc itself, honestly stating no new
  medium-confidence candidate was found — matching this project's standing
  "don't fabricate progress" posture (`feedback_verify_before_reporting_bugs`,
  `project_mapstack_ruled_out_candidates` memory).

## 3. Risks

- **Risk**: `verify-all.sh`/`pnpm verify` duplicates logic already in CI, drifting
  out of sync with the real CI config over time.
  **Mitigation**: script composes the *same* named `package.json` scripts CI
  already calls (`lint`, `test`, `test:secrets`) rather than reimplementing them,
  so there's one source of truth for each step; only the *sequencing* is new.
- **Risk**: dataset-completeness test is too strict (e.g. a genuinely legitimate
  dataset shape that doesn't need one of the four artifacts) and blocks future
  work.
  **Mitigation**: all 27 existing real datasets already satisfy all four checks
  (verified in research), so the test starts green with zero exceptions needed;
  if a real future exception arises it can be added explicitly rather than
  loosening the check silently.
- **Risk**: the data-drive research sweep finds nothing, making that half of the
  epic look like wasted effort.
  **Mitigation**: explicitly scoped as an acceptable, honest outcome in the
  approach above — a documented "no new candidate found, here's why" is real
  value (saves the next session from re-treading the same search), not a failure.

## 4. Dependencies

None on other in-flight epics. Builds on the existing `Dataset` interface,
`registry.ts`, `package.json` scripts, and `dataset-backlog.md` — no new
external services beyond what a new dataset story might need (unknowable until
the research sweep completes).

## 5. Open questions

1. Should `pnpm verify` also run the live-browser Playwright MCP check against
   localhost/production, or stop at the automatable `playwright test` suite?
   → **Resolved for this plan**: stop at automatable checks. The live MCP
   browser check needs a human-in-the-loop-capable agent session, not a plain
   shell script — out of scope for a `package.json` script.
2. If the data-drive research sweep finds multiple viable candidates, build just
   one (this epic) or all of them?
   → **Resolved for this plan**: build the single most-feasible one found,
   matching this session's established one-dataset-per-increment shipping
   cadence; further candidates go back into the backlog doc for a future pass.

## 6. Scale assessment

**Medium** — multi-file (new test file, new script, registry-scope assertions,
backlog doc, one new dataset's full file set), cross-cutting (touches the test
suite, build tooling, and the dataset layer), but not a new system or migration.

SCALE DECISION: Medium + --fast → skipping H/V planning entirely, proceeding
directly to story decomposition.

--skip-sign-off honored: presenting this document as a summary and auto-advancing
rather than blocking on user confirmation, per the flag passed to `/plan`.
