import type { ActiveLayer } from "@/lib/active-layers";
import type { SortSpec } from "@/lib/power-user/resolve-sort-keys";

/**
 * Encodes/decodes a power-user view (selections + sort) into the `view` URL
 * param, so a view is restorable via a shared link, not just localStorage --
 * adapted from allergy-locator's src/lib/url-state.ts pattern (durable data
 * in localStorage per saved-views.ts, "what's on screen" in the URL).
 * `sortKeys` is an ordered tie-break sequence -- see sort.ts.
 */
export const VIEW_PARAM = "view";

export interface EncodedView {
  selections: ActiveLayer[];
  sortKeys: SortSpec[];
}

export function encodeView(view: EncodedView): string {
  return encodeURIComponent(JSON.stringify(view));
}

export function decodeView(raw: string): EncodedView | null {
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(raw));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("selections" in parsed) ||
      !Array.isArray((parsed as { selections: unknown }).selections)
    ) {
      return null;
    }
    const candidate = parsed as {
      selections: ActiveLayer[];
      sortKeys?: SortSpec[];
      sortBy?: ActiveLayer | null;
      direction?: string;
    };
    if (Array.isArray(candidate.sortKeys)) {
      return { selections: candidate.selections, sortKeys: candidate.sortKeys };
    }
    // Older shared links encoded a single sortBy/direction pair -- read them
    // in rather than silently dropping the sort from a link someone bookmarked.
    const sortKeys: SortSpec[] = candidate.sortBy
      ? [{ layer: candidate.sortBy, direction: candidate.direction === "desc" ? "desc" : "asc" }]
      : [];
    return { selections: candidate.selections, sortKeys };
  } catch {
    return null; // corrupted/foreign data -- fail open to null, never throw
  }
}
