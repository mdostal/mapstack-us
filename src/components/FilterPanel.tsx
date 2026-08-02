"use client";

import { useState } from "react";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { filterCityIds, type FilterCriterion } from "@/lib/db/filter";

interface Props {
  selected: ActiveLayer[];
  year: number | null;
  onFilterChange: (cityIds: Set<string> | null) => void;
}

/**
 * Multi-criteria filter UI over the currently-selected comparison columns --
 * "show me cities where grass severity >= 60 AND violent crime <= 40". Real
 * SQL join/WHERE via src/lib/db/filter.ts, the kind of query that wasn't
 * practical to hand-roll well over the old plain-array approach. See
 * .pHive/epics/data-store/docs/design-note.md.
 */
export function FilterPanel({ selected, year, onFilterChange }: Props) {
  const [thresholds, setThresholds] = useState<Record<string, { min: string; max: string }>>({});
  const [active, setActive] = useState(false);
  const [error, setError] = useState(false);

  if (selected.length < 2) return null;

  function setThreshold(key: string, field: "min" | "max", value: string) {
    setThresholds((prev) => {
      const existing = prev[key] ?? { min: "", max: "" };
      return { ...prev, [key]: { ...existing, [field]: value } };
    });
  }

  async function apply() {
    const criteria: FilterCriterion[] = selected.map((layer) => {
      const t = thresholds[activeLayerKey(layer)];
      const min = t?.min?.trim() ? Number(t.min) : null;
      const max = t?.max?.trim() ? Number(t.max) : null;
      return { layer, min, max };
    });

    try {
      const cityIds = await filterCityIds(criteria, year);
      setError(false);
      setActive(cityIds !== null);
      onFilterChange(cityIds);
    } catch (err) {
      console.error("Filter query failed", err);
      setError(true);
    }
  }

  function clear() {
    setThresholds({});
    setActive(false);
    setError(false);
    onFilterChange(null);
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Filter by threshold
      </h2>
      {selected.map((layer) => {
        const resolved = resolveActiveLayer(layer);
        if (!resolved) return null;
        const key = activeLayerKey(layer);
        const t = thresholds[key];
        return (
          <div key={key} className="flex flex-col gap-1">
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              {resolved.dataset.label}: {resolved.layer.label}
            </span>
            <div className="flex items-center gap-1">
              <label htmlFor={`filter-min-${key}`} className="sr-only">
                Minimum {resolved.dataset.label}: {resolved.layer.label}
              </label>
              <input
                id={`filter-min-${key}`}
                type="number"
                min={0}
                max={100}
                placeholder="min"
                value={t?.min ?? ""}
                onChange={(e) => setThreshold(key, "min", e.target.value)}
                className="w-16 rounded border border-zinc-200 bg-transparent px-1.5 py-1 text-xs dark:border-zinc-700"
              />
              <span className="text-xs text-zinc-400">–</span>
              <label htmlFor={`filter-max-${key}`} className="sr-only">
                Maximum {resolved.dataset.label}: {resolved.layer.label}
              </label>
              <input
                id={`filter-max-${key}`}
                type="number"
                min={0}
                max={100}
                placeholder="max"
                value={t?.max ?? ""}
                onChange={(e) => setThreshold(key, "max", e.target.value)}
                className="w-16 rounded border border-zinc-200 bg-transparent px-1.5 py-1 text-xs dark:border-zinc-700"
              />
            </div>
          </div>
        );
      })}
      <div className="mt-1 flex gap-2">
        <button
          type="button"
          onClick={apply}
          className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        >
          Apply filter
        </button>
        {active && (
          <button type="button" onClick={clear} className="text-xs text-zinc-500 underline dark:text-zinc-400">
            Clear
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 dark:text-red-400">Filter is unavailable right now.</p>}
    </div>
  );
}
