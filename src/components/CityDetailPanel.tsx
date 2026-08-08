"use client";

import { baseColorForIndex } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import type { DatasetTimeContext } from "@/lib/datasets/types";
import cities from "@data/cities.json";

const CITY_BY_ID = new Map(cities.map((c) => [c.id, c]));

interface Props {
  cityId: string | null;
  active: ActiveLayer[];
  year: number | null;
  /** When provided, shows a "+ Compare" button (hidden once this city is
   * already in the comparison set, or the set is at its cap) that adds this
   * city to a side-by-side comparison -- see CityComparisonPanel.tsx. */
  onAddToComparison?: (cityId: string) => void;
  isInComparison?: boolean;
  comparisonAtCap?: boolean;
}

/** Full detail for every active layer at the selected city -- generalizes
 * allergy-locator's StateDetailPanel, which lists every active allergen
 * unabbreviated rather than just the one the map's color happens to show. */
export function CityDetailPanel({ cityId, active, year, onAddToComparison, isInComparison, comparisonAtCap }: Props) {
  if (!cityId) return null;
  const city = CITY_BY_ID.get(cityId);
  if (!city) return null;

  const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;

  return (
    <div data-testid="city-detail" className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="flex items-center justify-between gap-2">
        <p className="font-semibold text-zinc-900 dark:text-zinc-50">
          {city.city}, {city.state}
        </p>
        {onAddToComparison && !isInComparison && (
          <button
            type="button"
            onClick={() => onAddToComparison(cityId)}
            disabled={comparisonAtCap}
            title={comparisonAtCap ? "Comparison is full -- remove a city first" : "Add to comparison"}
            className="shrink-0 text-xs font-medium text-zinc-500 underline hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            + Compare
          </button>
        )}
        {isInComparison && (
          <span className="shrink-0 text-xs font-medium text-zinc-400 dark:text-zinc-500">In comparison</span>
        )}
      </div>
      {active.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">No layers active.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {active.map((item, index) => {
            const resolved = resolveActiveLayer(item);
            if (!resolved) return null;
            const result = resolved.dataset.getValue(cityId, resolved.layer.id, context);
            const color = baseColorForIndex(index, active.length);
            return (
              <li
                key={activeLayerKey(item)}
                data-testid="city-detail-row"
                className="flex items-start gap-2 text-xs"
              >
                <span
                  className="mt-0.5 h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <span className="text-zinc-600 dark:text-zinc-300">
                  <span className="font-medium text-zinc-800 dark:text-zinc-100">
                    {resolved.dataset.label}: {resolved.layer.label}
                  </span>{" "}
                  — {result ? result.detail : "No data for this layer."}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
