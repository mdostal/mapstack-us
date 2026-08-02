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
}

/** Full detail for every active layer at the selected city -- generalizes
 * allergy-locator's StateDetailPanel, which lists every active allergen
 * unabbreviated rather than just the one the map's color happens to show. */
export function CityDetailPanel({ cityId, active, year }: Props) {
  if (!cityId) return null;
  const city = CITY_BY_ID.get(cityId);
  if (!city) return null;

  const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;

  return (
    <div data-testid="city-detail" className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
        {city.city}, {city.state}
      </p>
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
