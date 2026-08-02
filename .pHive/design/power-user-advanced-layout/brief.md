# Design Brief: /advanced Sidebar Reorganization

Lightweight design note, not a full wireframe-protocol ceremony — the actual
decision process ran as a live wireframe comparison (4 real HTML mockups +
a synthesized 5th option, reviewed and picked by the operator) rather than
Frame0 (not installed/no MCP in this environment).

## Problem

The `/advanced` (power-user tab) sidebar had grown to five always-visible
panels (search, layer picker, filter, saved views, insights) stacked
vertically — reading as a wall of boxes rather than a tool.

## Decision: split by what each panel *is*

Not one generic restructure — a synthesis of three reviewed layout options,
picking the right structure per panel based on its nature:

- **Things you set** (search, filter, export) → top toolbar, above the main
  content. These are actions/inputs you reach for, not state you review.
- **Things you manage/review** (layers, saved views, formula) → left
  accordion sidebar. Layers open by default (used every visit); Saved views
  and Formula collapsed by default (used occasionally).
- **A result you read** (insights) → docked under the table, not competing
  with inputs for sidebar space.

## Components

- `AccordionSection.tsx` — generic collapsible section, matches
  `AddLayerPanel`'s existing expand/collapse convention.
- `FilterPopover.tsx` — wraps `FilterPanel` in a toolbar-triggered dropdown
  with click-outside-to-close.
- `InsightsDock.tsx` — collapsible dock under the table, open by default.
- CSV export logic extracted to `src/lib/power-user/build-comparison-csv.ts`
  so the toolbar button and (formerly) `ComparisonTable`'s internal button
  didn't duplicate the sort/filter/column computation.

## Verification

Verified in a live browser (not just the test suite) in both light and dark
mode via the Playwright MCP tools, screenshotting the toolbar, sidebar
accordion states, and filter popover before committing.
