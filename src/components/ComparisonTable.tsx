"use client";

import { useEffect, useRef } from "react";
import cities from "@data/cities.json";
import { activeLayerKey, isSameLayer, resolveActiveLayer, type ActiveLayer } from "@/lib/active-layers";
import { sortByKeys } from "@/lib/power-user/sort";
import { resolveSortKeys, type SortSpec } from "@/lib/power-user/resolve-sort-keys";
import type { DatasetTimeContext } from "@/lib/datasets/types";

interface Props {
  selected: ActiveLayer[];
  year?: number | null;
  selectedCityId?: string | null;
  onSelectCity?: (cityId: string) => void;
  /** Sort state is controlled by the parent (not local) so pu-4 can save and
   * restore it as part of a named view. Ordered, primary first -- see
   * sort.ts's header comment for why a list of these is a tie-break
   * sequence, never a combined score. */
  sortKeys: SortSpec[];
  onSortKeysChange: (sortKeys: SortSpec[]) => void;
  /** null = no filter applied (show all cities); a Set restricts rendered
   * rows to those ids -- see FilterPanel / src/lib/db/filter.ts. */
  visibleCityIds?: Set<string> | null;
}

/**
 * Per-city comparison table: one column per selected (dataset, layer) pair,
 * each header carrying that dataset's methodology note IN THE HEADER (never
 * a footnote) so nothing reads as a single unexplained composite number --
 * see design-discussion.md §3.2/§3.3 (no cross-dataset combined score in
 * this epic; grill-record findings U1/P1). Clicking a column header sorts
 * by that single column only, matching pu-2's original single-click
 * behavior; shift-clicking a different column ADDS it as a tie-break key
 * rather than replacing the sort -- still no cross-column combination, just
 * a priority-ordered sequence of independent comparisons (see sort.ts).
 * Row click selects a city, syncing the shared `city` URL param (pu-3).
 */
export function ComparisonTable({
  selected,
  year = null,
  selectedCityId = null,
  onSelectCity,
  sortKeys,
  onSortKeysChange,
  visibleCityIds = null,
}: Props) {
  const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;
  const selectedRowRef = useRef<HTMLTableRowElement>(null);

  useEffect(() => {
    // Selecting a city via CitySearch (src/lib/db/client.ts-backed search)
    // can select a row far outside the current scroll position -- scroll it
    // into view rather than leaving the user to hunt for a highlighted row.
    selectedRowRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedCityId]);

  if (selected.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Select 2+ layers on the left to compare cities.
      </div>
    );
  }

  const columns = selected.map((item) => ({ item, resolved: resolveActiveLayer(item) })).filter((c) => c.resolved);

  /** Plain click: sort solely by this column (toggling direction on repeat
   * clicks of the current sole key) -- identical to pu-2's original
   * behavior. Shift-click: add this column as the next tie-break key, or
   * toggle its direction in place if it's already one of the active keys,
   * without disturbing the others. */
  function handleHeaderClick(item: ActiveLayer, shiftKey: boolean) {
    if (shiftKey) {
      const existingIndex = sortKeys.findIndex((k) => isSameLayer(k.layer, item));
      if (existingIndex === -1) {
        onSortKeysChange([...sortKeys, { layer: item, direction: "asc" }]);
      } else {
        const next = [...sortKeys];
        next[existingIndex] = {
          ...next[existingIndex],
          direction: next[existingIndex].direction === "asc" ? "desc" : "asc",
        };
        onSortKeysChange(next);
      }
      return;
    }
    const isSoleKey = sortKeys.length === 1 && isSameLayer(sortKeys[0].layer, item);
    const direction = isSoleKey && sortKeys[0].direction === "asc" ? "desc" : "asc";
    onSortKeysChange([{ layer: item, direction }]);
  }

  const visibleCities = visibleCityIds ? cities.filter((c) => visibleCityIds.has(c.id)) : cities;

  const sortedCities = sortByKeys(visibleCities, resolveSortKeys(sortKeys, context));

  if (visibleCityIds && visibleCityIds.size === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No cities match your filter.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              City
            </th>
            {columns.map(({ item, resolved }) => {
              const keyIndex = sortKeys.findIndex((k) => isSameLayer(k.layer, item));
              const isSorted = keyIndex !== -1;
              const keyDirection = isSorted ? sortKeys[keyIndex].direction : null;
              const priority = sortKeys.length > 1 && isSorted ? keyIndex + 1 : null;
              return (
                <th
                  key={activeLayerKey(item)}
                  scope="col"
                  aria-sort={isSorted ? (keyDirection === "asc" ? "ascending" : "descending") : "none"}
                  className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                >
                  <button
                    type="button"
                    onClick={(e) => handleHeaderClick(item, e.shiftKey)}
                    title="Click to sort by this column. Shift-click to add it as a tie-break for the current sort."
                    className="flex items-center gap-1 text-left hover:underline"
                  >
                    {resolved!.dataset.label}: {resolved!.layer.label}
                    <span aria-hidden className="text-zinc-400">
                      {isSorted ? (keyDirection === "asc" ? "↑" : "↓") : "↕"}
                    </span>
                    {priority !== null && (
                      <span
                        aria-hidden
                        className="rounded-full bg-zinc-200 px-1 text-[10px] font-normal leading-tight text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                      >
                        {priority}
                      </span>
                    )}
                    {priority !== null && <span className="sr-only">(sort priority {priority})</span>}
                  </button>
                  <div className="mt-0.5 font-normal text-zinc-500 dark:text-zinc-400">
                    {resolved!.dataset.description}{" "}
                    <a
                      href={resolved!.dataset.methodologyUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      See methodology
                    </a>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedCities.map((city) => {
            const isSelected = selectedCityId === city.id;
            return (
              <tr
                key={city.id}
                ref={isSelected ? selectedRowRef : undefined}
                onClick={() => onSelectCity?.(city.id)}
                aria-selected={isSelected}
                className={`${
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-950"
                    : "odd:bg-white even:bg-zinc-50 dark:odd:bg-black dark:even:bg-zinc-950"
                } ${onSelectCity ? "cursor-pointer" : ""}`}
              >
                <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-100">
                  {city.city}, {city.state}
                </th>
                {columns.map(({ item, resolved }) => {
                  const result = resolved!.dataset.getValue(city.id, resolved!.layer.id, context);
                  return (
                    <td key={activeLayerKey(item)} className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300">
                      {result ? result.detail : <span className="text-zinc-400 dark:text-zinc-600">No data</span>}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
