"use client";

import type { ActiveLayer } from "@/lib/active-layers";
import { getMapLayerMeta, type LayerRenderControl } from "@/lib/map-layers";

interface Props {
  active: ActiveLayer[];
  customOverlayLabel: string | null;
  getControl: (key: string) => LayerRenderControl;
  onChange: (key: string, patch: Partial<LayerRenderControl>) => void;
}

/**
 * A compact, horizontally-scrollable strip of per-layer map controls above
 * the map -- explicit operator feedback: a legend/key that grows with every
 * layer and pushes the map down is the wrong shape; this stays a fixed
 * height and scrolls sideways instead.
 *
 * Visibility here is independent of the Layers picker's selection: hiding a
 * layer only affects what the MAP renders, not the table/CSV/filter/sort,
 * which still use every selected layer -- lets you flip a layer on/off to
 * compare without re-adding it via the sidebar each time.
 *
 * "Invert" flips a layer's color direction (dark = low/good instead of
 * dark = high/concerning) -- e.g. invert care access so GOOD access reads
 * dark, then look for the darkest spot that also stays light on every
 * other (non-inverted) layer: a city good on the thing you inverted and
 * good on everything else at once.
 */
export function MapLayerControls({ active, customOverlayLabel, getControl, onChange }: Props) {
  const layers = getMapLayerMeta(active, customOverlayLabel);
  if (layers.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Map layer controls">
      {layers.map((layer) => {
        const control = getControl(layer.key);
        return (
          <div
            key={layer.key}
            role="group"
            aria-label={layer.label}
            className={`flex w-52 flex-shrink-0 flex-col gap-1.5 rounded-lg border p-2 text-xs ${
              control.inverted
                ? "border-amber-400 bg-amber-50 dark:border-amber-600 dark:bg-amber-950/30"
                : "border-zinc-200 dark:border-zinc-800"
            } ${control.visible ? "" : "opacity-50"}`}
          >
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                style={{ backgroundColor: layer.color }}
              />
              <span className="flex-1 truncate font-medium text-zinc-700 dark:text-zinc-300" title={layer.label}>
                {layer.label}
              </span>
              {layer.isCustom && (
                <span
                  className="flex-shrink-0 text-amber-600 dark:text-amber-500"
                  title="Your custom formula weights -- not the shipped/validated score"
                >
                  *
                </span>
              )}
            </div>
            {control.inverted && (
              <span className="flex-shrink-0 self-start rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:bg-amber-800 dark:text-amber-100">
                ⇅ Inverted — dark = low/good
              </span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onChange(layer.key, { visible: !control.visible })}
                aria-pressed={control.visible}
                aria-label={`${control.visible ? "Hide" : "Show"} ${layer.label} on the map`}
                className="rounded border border-zinc-200 px-1.5 py-0.5 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
              >
                {control.visible ? "Shown" : "Hidden"}
              </button>
              <button
                type="button"
                onClick={() => onChange(layer.key, { inverted: !control.inverted })}
                aria-pressed={control.inverted}
                title="Flip this layer's color direction: dark = low/good instead of dark = high/concerning"
                className={`rounded border px-1.5 py-0.5 font-medium ${
                  control.inverted
                    ? "border-amber-600 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-600"
                    : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                }`}
              >
                {control.inverted ? "Inverted ✓" : "Invert"}
              </button>
            </div>
            <label className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="flex-shrink-0">Opacity</span>
              <input
                type="range"
                min={10}
                max={100}
                value={control.opacity}
                onChange={(e) => onChange(layer.key, { opacity: Number(e.target.value) })}
                aria-label={`${layer.label} opacity`}
                className="w-full"
              />
              <span className="w-8 flex-shrink-0 text-right tabular-nums">{control.opacity}%</span>
            </label>
          </div>
        );
      })}
    </div>
  );
}
