"use client";

import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";

/**
 * Single source of truth for the `city`/`year` URL param names/format shared
 * between `/` and `/mapstack/advanced` -- see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §4 (low risk: a
 * naming/format mismatch between routes would silently drop the shared
 * selection). Both routes MUST read/write through this hook, never parse
 * `city`/`year` params independently.
 *
 * Writes via `window.history.replaceState` directly, NOT next/navigation's
 * `router.replace()` -- a real production bug found live: router.replace()
 * triggers Next's client-side RSC data fetch for the new URL
 * (`?...&_rsc=<hash>`), which 404s specifically through this app's
 * multi-zone rewrite (tools.mdostal.com -> this app), and Next's fallback
 * to a full browser navigation on that failure remounts the whole page --
 * silently resetting every bit of state that isn't itself URL-backed
 * (active map layers, filters, per-layer render controls, formula
 * weights...) on every single city click or year change in production.
 * Never reproduced locally (`pnpm start` serves its own RSC payloads
 * directly, no rewrite in the way) -- only surfaced testing the real
 * tools.mdostal.com domain.
 *
 * Reads via useSyncExternalStore -- React's own purpose-built API for
 * "subscribe to an external mutable source, SSR/hydration-safe" (exactly
 * this: the browser's URL). `history.replaceState()` doesn't fire a
 * `popstate` event (that only fires on real back/forward navigation), so
 * this module also dispatches a same-tab custom event after every write,
 * which the store subscribes to alongside real `popstate`.
 */
const CITY_PARAM = "city";
const YEAR_PARAM = "year";
const SYNC_EVENT = "mapstack:shared-view-params-changed";

export interface SharedViewParams {
  cityId: string | null;
  year: number | null;
  setCityId: (cityId: string | null) => void;
  setYear: (year: number | null) => void;
  /** The current city/year as a "?city=&year=" query string (empty string if
   * neither is set) -- append to a cross-view Link's href so navigating
   * between `/` and `/mapstack/advanced` carries the selection forward. */
  queryString: string;
}

/**
 * Call after any OTHER direct `window.history.replaceState` write to the
 * URL (e.g. PowerUserPanel.tsx's own `view` param write for restoring a
 * saved view) so this hook's snapshot doesn't go stale -- `popstate` only
 * fires for real back/forward navigation, never for a programmatic
 * `history.replaceState` call, in this tab or any other.
 */
export function notifySharedViewParamsChanged(): void {
  window.dispatchEvent(new Event(SYNC_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener("popstate", callback);
  window.addEventListener(SYNC_EVENT, callback);
  return () => {
    window.removeEventListener("popstate", callback);
    window.removeEventListener(SYNC_EVENT, callback);
  };
}

function getSnapshot(): string {
  return window.location.search;
}

// A static/prerendered page has no way to know a future visitor's real
// query string at build time -- always empty for the server render AND for
// React's first (hydration-matching) client render, same constraint
// next/navigation's own useSearchParams() works around internally. The real
// value is read a moment later via getSnapshot, once mounted.
function getServerSnapshot(): string {
  return "";
}

function parseSearch(search: string): { cityId: string | null; year: number | null } {
  const params = new URLSearchParams(search);
  const cityId = params.get(CITY_PARAM);
  const yearRaw = params.get(YEAR_PARAM);
  const year = yearRaw !== null && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : null;
  return { cityId, year };
}

export function useSharedViewParams(): SharedViewParams {
  const pathname = usePathname();
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { cityId, year } = parseSearch(search);

  const updateParams = useCallback(
    (updates: { city?: string | null; year?: number | null }) => {
      const params = new URLSearchParams(window.location.search);
      if ("city" in updates) {
        if (updates.city) params.set(CITY_PARAM, updates.city);
        else params.delete(CITY_PARAM);
      }
      if ("year" in updates) {
        if (updates.year !== null && updates.year !== undefined) params.set(YEAR_PARAM, String(updates.year));
        else params.delete(YEAR_PARAM);
      }
      const qs = params.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      window.history.replaceState(window.history.state, "", url);
      notifySharedViewParamsChanged();
    },
    [pathname],
  );

  const setCityId = useCallback((next: string | null) => updateParams({ city: next }), [updateParams]);
  const setYear = useCallback((next: number | null) => updateParams({ year: next }), [updateParams]);

  const crossViewParams = new URLSearchParams();
  if (cityId) crossViewParams.set(CITY_PARAM, cityId);
  if (year !== null) crossViewParams.set(YEAR_PARAM, String(year));
  const qs = crossViewParams.toString();
  const queryString = qs ? `?${qs}` : "";

  return { cityId, year, setCityId, setYear, queryString };
}
