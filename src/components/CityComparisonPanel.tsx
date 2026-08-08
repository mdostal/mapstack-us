"use client";

import { baseColorForIndex } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import type { DatasetTimeContext } from "@/lib/datasets/types";
import cities from "@data/cities.json";

const CITY_BY_ID = new Map(cities.map((c) => [c.id, c]));

interface Props {
  cityIds: string[];
  active: ActiveLayer[];
  year: number | null;
  onRemove: (cityId: string) => void;
  onClear: () => void;
}

/** Side-by-side comparison across a few chosen cities -- lives in the main
 * content column (not the narrow left sidebar CityDetailPanel sits in) so a
 * real multi-column table has room to breathe. A lighter, map-integrated
 * counterpart to /advanced's full comparison table: pick cities right from
 * the map instead of sorting/filtering a table of all 512. */
export function CityComparisonPanel({ cityIds, active, year, onRemove, onClear }: Props) {
  const cityList = cityIds.map((id) => CITY_BY_ID.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  if (cityList.length === 0) return null;

  const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;

  return (
    <div data-testid="city-comparison-panel" className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Comparing {cityList.length} {cityList.length === 1 ? "city" : "cities"}
        </h2>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Clear
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-40 shrink-0 border-b border-zinc-200 pb-1.5 text-left font-medium text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                Layer
              </th>
              {cityList.map((city) => (
                <th
                  key={city.id}
                  className="border-b border-zinc-200 px-2 pb-1.5 text-left font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
                >
                  <div className="flex items-center gap-1.5">
                    <span>
                      {city.city}, {city.state}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemove(city.id)}
                      aria-label={`Remove ${city.city}, ${city.state} from comparison`}
                      className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                    >
                      ✕
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {active.length === 0 ? (
              <tr>
                <td colSpan={cityList.length + 1} className="py-2 text-zinc-500 dark:text-zinc-400">
                  No layers active.
                </td>
              </tr>
            ) : (
              active.map((item, index) => {
                const resolved = resolveActiveLayer(item);
                if (!resolved) return null;
                const color = baseColorForIndex(index, active.length);
                return (
                  <tr key={activeLayerKey(item)} data-testid="city-comparison-row">
                    <td className="py-1.5 pr-2 align-top text-zinc-600 dark:text-zinc-300">
                      <span className="mr-1.5 inline-block h-2 w-2 rounded-full align-middle" style={{ backgroundColor: color }} aria-hidden />
                      {resolved.dataset.label}: {resolved.layer.label}
                    </td>
                    {cityList.map((city) => {
                      const result = resolved.dataset.getValue(city.id, resolved.layer.id, context);
                      return (
                        <td key={city.id} className="py-1.5 px-2 align-top text-zinc-600 dark:text-zinc-300">
                          {result ? result.detail : "No data for this layer."}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
