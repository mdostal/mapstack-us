import type { ActiveLayer } from "@/lib/active-layers";
import type { SortDirection } from "@/lib/power-user/sort";

/**
 * Encodes/decodes a power-user view (selections + sort) into the `view` URL
 * param, so a view is restorable via a shared link, not just localStorage --
 * adapted from allergy-locator's src/lib/url-state.ts pattern (durable data
 * in localStorage per saved-views.ts, "what's on screen" in the URL).
 */
export const VIEW_PARAM = "view";

export interface EncodedView {
  selections: ActiveLayer[];
  sortBy: ActiveLayer | null;
  direction: SortDirection;
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
    const candidate = parsed as { selections: ActiveLayer[]; sortBy?: ActiveLayer | null; direction?: string };
    return {
      selections: candidate.selections,
      sortBy: candidate.sortBy ?? null,
      direction: candidate.direction === "desc" ? "desc" : "asc",
    };
  } catch {
    return null; // corrupted/foreign data -- fail open to null, never throw
  }
}
