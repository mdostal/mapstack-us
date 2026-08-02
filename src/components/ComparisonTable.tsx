"use client";

import { useEffect, useRef } from "react";
import cities from "@data/cities.json";
import { resolveActiveLayer, activeLayerKey, isSameLayer, type ActiveLayer } from "@/lib/active-layers";
import { sortByValue, type SortDirection } from "@/lib/power-user/sort";
import { buildCsv, downloadCsv } from "@/lib/power-user/csv-export";
import type { DatasetTimeContext } from "@/lib/datasets/types";

interface Props {
  selected: ActiveLayer[];
  year?: number | null;
  selectedCityId?: string | null;
  onSelectCity?: (cityId: string) => void;
  /** Sort state is controlled by the parent (not local) so pu-4 can save and
   * restore it as part of a named view. */
  sortBy: ActiveLayer | null;
  direction: SortDirection;
  onSortChange: (sortBy: ActiveLayer | null, direction: SortDirection) => void;
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
 * by that single column only (pu-2) -- no cross-column combination. Row
 * click selects a city, syncing the shared `city` URL param (pu-3).
 */
export function ComparisonTable({
  selected,
  year = null,
  selectedCityId = null,
  onSelectCity,
  sortBy,
  direction,
  onSortChange,
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

  function handleHeaderClick(item: ActiveLayer) {
    if (sortBy && isSameLayer(sortBy, item)) {
      onSortChange(item, direction === "asc" ? "desc" : "asc");
    } else {
      onSortChange(item, "asc");
    }
  }

  const visibleCities = visibleCityIds ? cities.filter((c) => visibleCityIds.has(c.id)) : cities;

  const sortColumn = sortBy ? columns.find((c) => isSameLayer(c.item, sortBy)) : undefined;
  const sortedCities = sortColumn
    ? sortByValue(
        visibleCities,
        (city) => sortColumn.resolved!.dataset.getValue(city.id, sortColumn.resolved!.layer.id, context)?.value ?? null,
        direction,
      )
    : visibleCities;

  if (visibleCityIds && visibleCityIds.size === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        No cities match your filter.
      </div>
    );
  }

  function exportCsv() {
    const csv = buildCsv(
      sortedCities.map((city) => ({ id: city.id, label: `${city.city}, ${city.state}` })),
      columns.map(({ resolved }) => ({
        header: `${resolved!.dataset.label}: ${resolved!.layer.label}`,
        getValue: (cityId: string) => resolved!.dataset.getValue(cityId, resolved!.layer.id, context)?.detail ?? "No data",
      })),
    );
    downloadCsv(`mapstack-comparison-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <div className="flex flex-1 flex-col gap-2">
      <button
        type="button"
        onClick={exportCsv}
        className="self-end rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
      >
        Export CSV
      </button>
      <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              City
            </th>
            {columns.map(({ item, resolved }) => {
              const isSorted = sortBy !== null && isSameLayer(sortBy, item);
              return (
                <th
                  key={activeLayerKey(item)}
                  scope="col"
                  aria-sort={isSorted ? (direction === "asc" ? "ascending" : "descending") : "none"}
                  className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                >
                  <button
                    type="button"
                    onClick={() => handleHeaderClick(item)}
                    className="flex items-center gap-1 text-left hover:underline"
                  >
                    {resolved!.dataset.label}: {resolved!.layer.label}
                    <span aria-hidden className="text-zinc-400">
                      {isSorted ? (direction === "asc" ? "↑" : "↓") : "↕"}
                    </span>
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
    </div>
  );
}
