"use client";

import { baseColorForIndex } from "@/lib/palette/ramps";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  onRemove: (layer: ActiveLayer) => void;
  /** Per-layer map visibility, independent of `active` -- explicit operator
   * feedback: with several layers stacked, you want to quickly flip one on
   * or off to compare without losing your place in the list (the full
   * invert/opacity strip stays an /advanced-only affordance; simple view
   * only needs the on/off toggle). Keyed the same way as
   * lib/map-layers.ts's LayerRenderControl. */
  isVisible: (key: string) => boolean;
  onToggleVisible: (layer: ActiveLayer) => void;
}

export function ActiveLayersList({ active, onRemove, isVisible, onToggleVisible }: Props) {
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
        const key = activeLayerKey(item);
        const visible = isVisible(key);
        const label = `${resolved.dataset.label}: ${resolved.layer.label}`;
        return (
          <li
            key={key}
            data-testid="active-layers-row"
            className={`flex items-center justify-between gap-2 rounded-md border border-zinc-200 px-2.5 py-1.5 text-xs dark:border-zinc-800 ${visible ? "" : "opacity-50"}`}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <span className="truncate text-zinc-700 dark:text-zinc-300">{label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              <button
                type="button"
                onClick={() => onToggleVisible(item)}
                aria-pressed={visible}
                aria-label={`${visible ? "Hide" : "Show"} ${label} on the map`}
                title={visible ? "Hide on the map (keeps it in this list)" : "Show on the map"}
                className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                {visible ? "👁" : "🚫"}
              </button>
              <button
                type="button"
                onClick={() => onRemove(item)}
                aria-label={`Remove ${label}`}
                className="text-zinc-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
