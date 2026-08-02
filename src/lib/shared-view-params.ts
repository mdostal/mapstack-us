"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Single source of truth for the `city`/`year` URL param names/format shared
 * between `/` and `/mapstack/advanced` -- see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §4 (low risk: a
 * naming/format mismatch between routes would silently drop the shared
 * selection). Both routes MUST read/write through this hook, never parse
 * `city`/`year` params independently.
 */
const CITY_PARAM = "city";
const YEAR_PARAM = "year";

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

export function useSharedViewParams(): SharedViewParams {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cityId = searchParams.get(CITY_PARAM);
  const yearRaw = searchParams.get(YEAR_PARAM);
  const year = yearRaw !== null && Number.isFinite(Number(yearRaw)) ? Number(yearRaw) : null;

  function updateParams(updates: { city?: string | null; year?: number | null }) {
    const params = new URLSearchParams(searchParams.toString());
    if ("city" in updates) {
      if (updates.city) params.set(CITY_PARAM, updates.city);
      else params.delete(CITY_PARAM);
    }
    if ("year" in updates) {
      if (updates.year !== null && updates.year !== undefined) params.set(YEAR_PARAM, String(updates.year));
      else params.delete(YEAR_PARAM);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const setCityId = (next: string | null) => updateParams({ city: next });
  const setYear = (next: number | null) => updateParams({ year: next });

  const crossViewParams = new URLSearchParams();
  if (cityId) crossViewParams.set(CITY_PARAM, cityId);
  if (year !== null) crossViewParams.set(YEAR_PARAM, String(year));
  const qs = crossViewParams.toString();
  const queryString = qs ? `?${qs}` : "";

  return { cityId, year, setCityId, setYear, queryString };
}
