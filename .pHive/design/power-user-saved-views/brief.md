# Design Brief: Saved Views Panel

**Topic:** power-user-saved-views
**Surface kind:** component
**Location:** left sidebar of `/mapstack/advanced`, below the Layer Picker
**Selected rendition:** 1 (ASCII, `.pHive/design/power-user-saved-views/wireframe.txt`)
**Source:** plan-delegated (epic `power-user-tab`, story `pu-4-saved-views`)
**Brand context:** none found — no `.pHive/brand/brand-system.yaml` yet; follows existing app conventions (no modal precedent anywhere in mapstack-us today).

## Layout

A "Saved Views" section stacked below the Layer Picker (from the
`power-user-comparison-table` topic) in the same left sidebar. A "Save current
view..." button at the top, then a flat list of saved views, each row showing
the view's name plus Restore / Rename / Delete actions. An empty state when no
views are saved yet.

## Components

- `SavedViewsList` — flat list, one row per saved view.
- `SaveViewButton` — click reveals an inline text input (name) + Save/Cancel;
  no modal (matches the project's no-boilerplate developer preference and the
  absence of any modal pattern elsewhere in the app).
- Empty state: "No saved views yet. Select layers above, then Save current
  view to keep them."

## Interactions

- **Save:** captures current layer selections + sort column (per `pu-2`) into
  a named view. No city/year captured — saved views are about dataset/layer/
  sort choices, not a specific city/year snapshot (matches the story's
  `selections: ActiveLayer[], sortBy` shape, not a full app-state snapshot).
- **Restore:** one click updates the Layer Picker selections + Comparison
  Table sort to match the saved view, in a single action (not a multi-step
  flow).
- **Rename:** inline edit of the name field.
- **Delete:** browser-native `confirm()` before removing — acceptable for v1
  given the project's lean, no-boilerplate posture; a custom confirmation
  dialog is not warranted at this scale.

## Accessibility notes

- Restore/Rename/Delete are real `<button>` elements per row, each with an
  accessible name that includes the view name (e.g. `aria-label="Delete saved
  view: Grass + Violent Crime"`) so screen-reader users can distinguish rows.
- The inline "Save" name input needs a visible `<label>` (or
  `aria-label`), not just a placeholder, per WCAG label requirements.
- Empty-state text must be real DOM text (not a background image or
  CSS-only pseudo-element) so it's readable by assistive tech.

## Explicitly out of scope for this brief

- URL-based sharing/restoring of a saved view (the `url-state.ts` half of
  `pu-4` is a data-layer concern, not a new visual surface — no separate
  wireframe needed for it).
- Any cross-dataset combined score in the saved shape — per the epic's
  design-discussion §3.3, saved views store selections and a single sort
  column only, never a computed value.
