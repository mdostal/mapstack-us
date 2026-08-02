import type { ActiveLayer } from "@/lib/active-layers";
import type { SortDirection } from "@/lib/power-user/sort";

/**
 * Named, saved power-user views: client-side only via localStorage, no
 * accounts, no backend -- adapted from allergy-locator's
 * src/lib/profiles.ts (same CRUD shape, same fail-open-on-corrupt-JSON
 * behavior, ported deliberately rather than rewritten -- see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §3.5 and the
 * story's highest-named risk: dropping the fail-open behavior during a
 * rushed port).
 *
 * Stores selections + sort choice only -- never a computed/derived value,
 * consistent with the epic-wide decision not to persist a cross-dataset
 * combined score (design-discussion.md §3.3).
 */
export interface SavedView {
  id: string;
  name: string;
  selections: ActiveLayer[];
  sortBy: ActiveLayer | null;
  direction: SortDirection;
  savedAt: string;
}

const STORAGE_KEY = "mapstack:saved-views";

export function getSavedViews(): SavedView[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // corrupted/foreign data -- fail open to an empty list, never throw
  }
}

function writeViews(views: SavedView[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
}

export function saveView(
  name: string,
  selections: ActiveLayer[],
  sortBy: ActiveLayer | null,
  direction: SortDirection,
): SavedView {
  const view: SavedView = {
    id: crypto.randomUUID(),
    name,
    selections,
    sortBy,
    direction,
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
