# Design Discussion: Release One Readiness

## 1. What Are We Doing?

The operator asked for a structured pass to confirm mapstack-us is actually solid for a
real open-source release: run a review, resolve what it finds, adversarially check the
result, then loop plan/execute against whatever real backlog remains. "Done" here isn't
a feature — it's confidence that a stranger cloning this repo today gets a build that
works, a UI that doesn't lie to them or lock out keyboard/screen-reader users, and a
codebase that isn't hiding stale claims about its own data. I've already done the review
+ fix half of this (27 shipped commits, all CI-green, all verified live); this doc is the
adversarial-check half, written after the fact rather than before, since the fixing was
itself the design work.

## 2. What I Found

Four parallel review agents (security, code quality, test/a11y, docs-accuracy) surfaced
16 real findings, none catastrophic, most either doc drift or accessibility gaps — see
git log `5a315a6..8e331a5` for the full list. Highlights: a fresh clone couldn't even
`pnpm install` on modern pnpm (`ERR_PNPM_IGNORED_BUILDS`, fixed via `packageManager` pin
+ `onlyBuiltDependencies`); the map's `role="img"` on `BaseSvgMap.tsx`'s `<svg>` was
hiding every city marker's label from screen readers, and markers had no `tabIndex` at
all (real WCAG 2.1.1 violation); README claimed 6 keyed datasets when the real count
(verified against every `gen_*.py` script's actual `API_KEY` reads) was 11; `next.config.ts`
had zero security headers despite BYOK chat keys sitting in localStorage.

I then self-audited for a second, lower-severity batch (11 more items, git log
`8e331a5..f90f670`): no `aria-live` anywhere in `src/`, the Map/Table and dataset-category
tabs had `role="tablist"`/`role="tab"` but no roving-tabindex or arrow-key nav (same gap
`ChatPanel.tsx`'s radiogroup already had and had already fixed — I just hadn't applied the
pattern everywhere), zero React component unit tests despite `@testing-library/react`
being installed, and a `concern`/`score` field-name split across 9 of 41 dataset JSON
files (cosmetic, not a bug, but real drift against the `Dataset` interface's own
documented "concern" contract).

The project's own established ship ritual (typecheck → lint → unit tests → build → e2e →
live browser check on localhost AND production, for every single commit) is the real
reason I trust these 27 fixes: nothing here is "should work," it's "confirmed working,
including on the actual deployed site." That ritual is itself now the strongest asset
this repo has going into a public release.

## 3. My Proposed Approach

Already executed, so this is a retrospective rather than a plan: fix→verify→ship one
finding at a time, smallest/safest first (README text, comment typos) before the riskier
ones (security headers, the Next.js version bump, the `concern`/`score` JSON rewrite).
The JSON rewrite in particular I did as a pure in-place key rename on the committed data
files, not a re-run of the live-fetch pipelines — deliberately avoiding any chance of
real data drift from an unrelated API hiccup, verified programmatically byte-for-byte
against git HEAD before committing.

## 4. What Could Go Wrong

**Medium — CI flakiness masking a real regression.** This session hit repeated ~8min
hangs on `pnpm exec playwright install --with-deps chromium` in CI, unrelated to any of
my changes (confirmed: `@playwright/test` version never changed, and every OTHER CI step
— lint, unit tests, build, secret scan — passed cleanly every single time this happened).
Cancelled and re-ran until it cleared, every time. Real risk: a future contributor sees a
red CI run, assumes their PR broke something, and either panics or (worse) works around it
incorrectly. Worth a `README`/`CONTRIBUTING.md` note if it keeps recurring.

**Low — the `pnpm.overrides` nanoid pin could silently go stale.** `next@16.3.1`'s own
`postcss` dependency allows `nanoid: "^3.3.16"` but pnpm didn't auto-resolve to the patched
3.3.18 without an explicit override. If `next` itself later bumps its transitive `postcss`
past a version needing a different override, `pnpm audit` will catch it — but only if
someone runs it. Not currently in CI.

**Low — the cross-browser Playwright projects (webkit/firefox/mobile) are configured but
never actually run in CI.** Real risk of silent drift: a WebKit-specific bug could ship
undetected indefinitely since nothing forces `test:e2e:all-browsers` to run. Deliberate
tradeoff (documented in the commit and in `playwright.config.ts` itself) given CI's
existing chromium-only flakiness — but worth a periodic manual run, not a "set and forget."

## 5. Dependencies and Constraints

No external dependencies beyond what's already pinned. The one real constraint is CI's
own runner infrastructure (GitHub Actions shared pool) — outside this repo's control, and
the source of every delay in this session's later half.

## 6. Open Questions — resolved during grill

1. ~~Is there genuine remaining dataset-backlog scope worth pursuing next?~~
   **Resolved.** Only 2 of `dataset-backlog.md`'s 32 ranked candidates are genuinely
   unbuilt (all 30 others map cleanly to shipped registry entries). Both remaining
   ones are low-viability by this project's own standards, not just "more effort":
   **noise pollution** (DOT/BTS National Transportation Noise Map — real, free,
   keyless, but needs GIS/GDAL raster tooling not currently in this stack) and
   **household wealth/net worth** (GEOWEALTH-US — free but explicitly modeled/
   imputed, PUMA-level geography only, ~100k population per unit vs. this project's
   per-city UX). Neither is a "yes, build this next" candidate as-is — see the
   grill-record's U1 and C1 findings, addressed below.
2. ~~Is `known-issues-backlog.md` still tracking real, unresolved issues?~~
   **Resolved: no.** All 4 substantive items are already fixed in current code
   (pollen superseded by `measured-grass-pollen.ts`; `CityDetailPanel` wired into
   `PowerUserPanel.tsx:357`; the invert-default confusion fixed via
   `DEFAULT_LAYER_CONTROL.inverted: false` + a persistent "Inverted ✓" badge in
   `MapLayerControls.tsx`; the sidebar-scroll issue fixed independently in both
   `PowerUserPanel.tsx` and `MapstackApp.tsx`). This backlog doc is exhausted.
3. Should the cross-browser Playwright projects get a scheduled CI job, or stay
   manual-only indefinitely? Still genuinely open — a real tradeoff between coverage
   and the CI flakiness already documented above, not something this session's
   evidence resolves either way. Leaving as a real open question for the operator.

**On the two remaining dataset candidates** (grill-record U1): given both are
low-viability by this project's own real constraints — not marginal effort, but a
missing tooling dependency (GDAL) and a data-realness posture conflict — the honest
verdict is that the dataset backlog is exhausted of things worth building *right
now*, not merely "no scope remains." If either is ever picked up: noise pollution
needs a GIS/GDAL evaluation as its own separate decision (new stack dependency,
real cost); household wealth (grill-record C1) would need the same explicit,
up-front "this is a modeled estimate, not a measurement" disclosure allergy.ts's
methodology doc already sets the precedent for — not built as if it were a direct
measurement like the other 40 datasets.

## 7. Verification Strategy

```
VERIFICATION PLAN:
  Tools: tsc --noEmit, eslint, vitest (713 unit tests incl. 27 new component tests),
         scripts/secret-scan.mjs, next build, Playwright (126 e2e tests, chromium)
  Platforms: Chromium in CI; WebKit/Firefox/Mobile Chrome available via
         `pnpm test:e2e:all-browsers` but not run in CI (see risk above)
  Automated: every fix in this batch — all 27 commits passed the full local ritual
         before push, and CI (chromium-scoped) confirmed green after
  Manual: live Playwright MCP browser verification on localhost AND
         tools.mdostal.com/mapstack production for every commit -- console errors
         checked at "error" level, expected to be exactly zero every time
  Not verifying: WebKit/Firefox/mobile in CI (documented tradeoff), load/performance
         testing (out of scope for an accessibility/docs-accuracy pass)
```

## 8. Scale Assessment

```
SCALE ASSESSMENT:
  Files affected: ~120 across 27 commits (39 ordinal-comment fixes in one commit alone,
    9 JSON+9 Python+9 TS in the schema-drift commit, 41 dataset files in the
    methodologyDocUrl refactor)
  Subsystems: a11y (map keyboard nav, ARIA tablist, aria-live, skip-link), security
    (CSP/headers, secret-scan patterns), CI (lint gate, cross-browser config), data
    integrity (JSON schema rename, dead-file removal), docs (README, CONTRIBUTING.md,
    .env.example), test infra (first-ever component unit tests)
  Migration required: no (in-place renames only, no breaking API changes)
  Cross-team coordination: no (solo open-source repo)
  Unknowns: 3 (the open questions above)

  RECOMMENDATION: Ship this design-discussion as the release-one verdict. The dataset
    backlog is exhausted of candidates worth building right now (2 remain, both
    low-viability -- see §6), and known-issues-backlog.md's items are all already
    fixed. No stories to decompose from either backlog.
  RATIONALE: The work described here is already done and verified, not proposed. A
    structured outline would be process theater at this point. This doc's own shape
    (retrospective, not forward-looking) is itself an open question for future
    release checkpoints -- see grill-record P1 -- but is accepted as-is for this one:
    the goal was an honest adversarial check of completed work, and a lighter,
    purpose-built "release verdict" doc might serve that better next time than
    reusing the forward-looking design-discussion template.
```
