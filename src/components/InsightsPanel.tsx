"use client";

import { useEffect, useState } from "react";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { getLayerInsights, type LayerInsights } from "@/lib/db/insights";

interface Props {
  selected: ActiveLayer[];
  year: number | null;
  onSelectCity: (cityId: string) => void;
}

/**
 * SQL-aggregate insights per selected layer: min/max/avg across every city
 * with data, plus the top-3/bottom-3 cities. Real MIN/MAX/AVG/ORDER BY ...
 * LIMIT queries against data.sqlite -- see src/lib/db/insights.ts and
 * .pHive/epics/data-store/docs/design-note.md.
 */
export function InsightsPanel({ selected, year, onSelectCity }: Props) {
  const [insights, setInsights] = useState<Record<string, LayerInsights | null>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(selected.map((layer) => getLayerInsights(layer, year).then((result) => [activeLayerKey(layer), result] as const)))
      .then((entries) => {
        if (cancelled) return;
        setInsights(Object.fromEntries(entries));
      })
      .catch((err) => {
        console.error("Insights query failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, year]);

  if (selected.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Insights</h2>
      {selected.map((layer) => {
        const resolved = resolveActiveLayer(layer);
        if (!resolved) return null;
        const key = activeLayerKey(layer);
        const layerInsights = insights[key];

        return (
          <div key={key} className="flex flex-col gap-1 text-xs">
            <span className="font-medium text-zinc-800 dark:text-zinc-100">
              {resolved.dataset.label}: {resolved.layer.label}
            </span>
            {layerInsights === undefined ? (
              <span className="text-zinc-400 dark:text-zinc-600">Loading…</span>
            ) : layerInsights === null ? (
              <span className="text-zinc-400 dark:text-zinc-600">No data for this selection.</span>
            ) : (
              <>
                <span className="text-zinc-600 dark:text-zinc-400">
                  min {layerInsights.min.toFixed(0)} · avg {layerInsights.avg.toFixed(0)} · max{" "}
                  {layerInsights.max.toFixed(0)} · {layerInsights.count} cities
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Highest:</span>
                  {layerInsights.top.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCity(c.id)}
                      className="text-left text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      {c.city}, {c.state} — {c.value.toFixed(0)}
                    </button>
                  ))}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-zinc-500 dark:text-zinc-400">Lowest:</span>
                  {layerInsights.bottom.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCity(c.id)}
                      className="text-left text-zinc-700 hover:underline dark:text-zinc-300"
                    >
                      {c.city}, {c.state} — {c.value.toFixed(0)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
