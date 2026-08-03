import type { ActiveLayer } from "@/lib/active-layers";
import type { SortSpec } from "@/lib/power-user/resolve-sort-keys";

/**
 * Named, saved power-user views: client-side only via localStorage, no
 * accounts, no backend -- adapted from allergy-locator's
 * src/lib/profiles.ts (same CRUD shape, same fail-open-on-corrupt-JSON
 * behavior, ported deliberately rather than rewritten -- see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §3.5 and the
 * story's highest-named risk: dropping the fail-open behavior during a
 * rushed port).
 *
 * Stores selections + sort keys only -- never a computed/derived value,
 * consistent with the epic-wide decision not to persist a cross-dataset
 * combined score (design-discussion.md §3.3). `sortKeys` is an ordered,
 * possibly-multi-entry tie-break sequence (see sort.ts) -- still not a
 * combined score, just a priority list of independent columns.
 */
export interface SavedView {
  id: string;
  name: string;
  selections: ActiveLayer[];
  sortKeys: SortSpec[];
  savedAt: string;
}

const STORAGE_KEY = "mapstack:saved-views";

/** Reads a possibly-older-shaped stored view (single `sortBy`/`direction`,
 * from before multi-key sort existed) into the current `sortKeys` shape.
 * Fails open like the rest of this module's localStorage reads -- an
 * unrecognized shape just gets no sort keys rather than throwing. */
function normalizeView(raw: unknown): SavedView | null {
  if (!raw || typeof raw !== "object") return null;
  const v = raw as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string" || !Array.isArray(v.selections)) return null;

  if (Array.isArray(v.sortKeys)) return v as unknown as SavedView;

  const legacySortBy = v.sortBy as ActiveLayer | null | undefined;
  const legacyDirection = v.direction === "desc" ? "desc" : "asc";
  const sortKeys: SortSpec[] = legacySortBy ? [{ layer: legacySortBy, direction: legacyDirection }] : [];
  return { ...v, sortKeys } as unknown as SavedView;
}

export function getSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeView).filter((v): v is SavedView => v !== null);
  } catch {
    return []; // corrupted/foreign data -- fail open to an empty list, never throw
  }
}

function writeViews(views: SavedView[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function saveView(name: string, selections: ActiveLayer[], sortKeys: SortSpec[]): SavedView {
  const view: SavedView = {
    id: crypto.randomUUID(),
    name,
    selections,
    sortKeys,
    savedAt: new Date().toISOString(),
  };
  writeViews([...getSavedViews(), view]);
  return view;
}

export function deleteView(id: string): void {
  writeViews(getSavedViews().filter((v) => v.id !== id));
}

export function renameView(id: string, name: string): void {
  writeViews(getSavedViews().map((v) => (v.id === id ? { ...v, name } : v)));
}
