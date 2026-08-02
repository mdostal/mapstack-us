"use client";

import { baseColorForIndex } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  onRemove: (layer: ActiveLayer) => void;
}

export function ActiveLayersList({ active, onRemove }: Props) {
  if (active.length === 0) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        No layers on the map yet -- add one below to get started.
      </p>
    );
  }

  return (
    <ul data-testid="active-layers-list" className="flex flex-col gap-1.5">
      {active.map((item, index) => {
        const resolved = resolveActiveLayer(item);
        if (!resolved) return null;
        const color = baseColorForIndex(index, active.length);
        return (
          <li
            key={activeLayerKey(item)}
            data-testid="active-layers-row"
            className="flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-800"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="truncate text-zinc-700 dark:text-zinc-300">
                {resolved.dataset.label}: {resolved.layer.label}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              aria-label={`Remove ${resolved.dataset.label}: ${resolved.layer.label}`}
              className="shrink-0 text-zinc-400 hover:text-red-500"
            >
              ✕
            </button>
          </li>
        );
      })}
    </ul>
  );
}
