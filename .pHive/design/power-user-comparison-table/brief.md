# Design Brief: Power-User Comparison Table + Layer Picker

**Topic:** power-user-comparison-table
**Surface kind:** screen
**Route:** `/mapstack/advanced`
**Selected rendition:** 1 (ASCII, `.pHive/design/power-user-comparison-table/wireframe.txt`)
**Source:** plan-delegated (epic `power-user-tab`, stories `pu-1-comparison-table`, `pu-2-sort`)
**Brand context:** none found — no `.pHive/brand/brand-system.yaml` yet; layout follows the existing app's visual conventions (sidebar + content shell, same width as `AddLayerPanel`) rather than a formal token system.

## Layout

Two-column shell matching the existing simple view's sidebar+content structure:

- **Left sidebar — Layer Picker.** A checkbox tree grouped by dataset (Allergy, Crime, ...), each dataset expandable to its layers. Reuses the visual weight/spacing of the existing `AddLayerPanel`. Reserves space below the picker for the future "Saved views" section (designed separately under the `power-user-saved-views` topic, story `pu-4`).
- **Right — Comparison Table.** One column per selected (dataset, layer) pair, plus a leading City column. Column headers are two-line: the layer name, then the dataset's methodology note in smaller text directly beneath it — never a footnote. Header is clickable to sort (↑↓ indicator shows current sort column/direction).
- **Top bar.** A `[Simple view] [Advanced]` nav control (exact mechanism — link vs. toggle — is an implementation decision for `pu-1`/`pu-3`, not fixed by this wireframe) alongside the existing theme toggle.

## Components

- `LayerPicker` — checkbox tree, dataset → layers, reusing `registry.ts`'s `DATASETS` for enumeration.
- `ComparisonTable` — header row (methodology notes + sort affordance) + one row per city.
- Empty state: fewer than 2 layers selected → centered prompt text, no empty table chrome.
- No-data cell state: a selected (dataset, layer, year) with `getValue() === null` for a city renders literal "no data" text, never a blank cell or a fabricated value.

## Interactions

- Checkbox toggle → immediately updates the comparison table (no submit button).
- Column header click → sorts ascending; click again → descending (per `pu-2`).
- Row click → selects that city, syncing the shared `city` URL param (per `pu-3`) — matches the existing `CityDetailPanel` click-to-select pattern already in the app.

## Accessibility notes

- Column headers double as sort buttons — must be real `<button>` elements (or `role="columnheader"` + `aria-sort`), not divs with click handlers, so sort is keyboard- and screen-reader-operable.
- Checkboxes need associated `<label>` elements (matches the existing `LayerPicker`-equivalent pattern already used in `AddLayerPanel`, per the researcher's findings).
- "No data" cells should not be silently empty to assistive tech — the literal text state (not just a visual dash) satisfies this by construction.

## Explicitly out of scope for this brief

- Saved-views UI (separate topic `power-user-saved-views`, story `pu-4`).
- Any cross-dataset combined score or "ranking" visual — per the epic's design-discussion §3.3, no such value exists to display.
