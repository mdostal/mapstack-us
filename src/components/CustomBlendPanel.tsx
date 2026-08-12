"use client";

import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { computeBlendValue, DEFAULT_BLEND_WEIGHT, MAX_BLEND_WEIGHT, type BlendWeights } from "@/lib/custom-blend";

interface Props {
  selected: ActiveLayer[];
  selectedCityId: string | null;
  year: number | null;
  weights: BlendWeights;
  onWeightsChange: (weights: BlendWeights) => void;
  overlayOn: boolean;
  onToggleOverlay: () => void;
}

/**
 * Explicit user direction, clarified before building: a power-user tool
 * to combine 2+ ACTIVE layers into one score, with a weighting the USER
 * picks -- never one this project invents on its own. This is a real
 * philosophy exception, spelled out here rather than left implicit: every
 * shipped dataset in this project (crime, hazard, SVI, political-lean...)
 * deliberately stays as separate honest layers rather than blending,
 * because inventing a cross-metric weighting isn't this project's call to
 * make. A user blending THEIR OWN selected layers at THEIR OWN chosen
 * weights is a different thing entirely -- the judgment call is theirs,
 * clearly labeled as such (an asterisked, opt-in overlay, never replacing
 * any shipped layer or feeding into the table/CSV/sort/filter). See
 * lib/custom-blend.ts's own doc comment.
 */
export function CustomBlendPanel({
  selected,
  selectedCityId,
  year,
  weights,
  onWeightsChange,
  overlayOn,
  onToggleOverlay,
}: Props) {
  if (selected.length < 2) {
    return (
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Select 2 or more layers above to blend them into a custom score.
      </p>
    );
  }

  function setWeight(layer: ActiveLayer, value: number) {
    onWeightsChange({ ...weights, [activeLayerKey(layer)]: value });
  }

  const context = year !== null ? { year } : undefined;
  const blendValue = selectedCityId ? computeBlendValue(selectedCityId, selected, weights, context) : null;

  return (
    <div className="flex flex-col gap-2 text-xs">
      <p className="rounded bg-amber-50 p-1.5 text-zinc-600 dark:bg-amber-950/30 dark:text-zinc-400">
        <b className="text-amber-700 dark:text-amber-400">Your blend, your weights.</b> This
        project deliberately ships every dataset as separate, honest layers rather than inventing
        a cross-dataset score -- this is the opt-in exception: YOU choose which layers and how much
        each counts. Never replaces any shipped layer or feeds the table, CSV, sort, or filter.
      </p>

      {selected.map((layer) => {
        const resolved = resolveActiveLayer(layer);
        if (!resolved) return null;
        const key = activeLayerKey(layer);
        const weight = weights[key] ?? DEFAULT_BLEND_WEIGHT;
        return (
          <div key={key} className="flex flex-col gap-0.5">
            <label htmlFor={`blend-weight-${key}`} className="flex justify-between text-zinc-600 dark:text-zinc-400">
              <span>
                {resolved.dataset.label}: {resolved.layer.label}
              </span>
              <span>{weight.toFixed(1)}×</span>
            </label>
            <input
              id={`blend-weight-${key}`}
              type="range"
              min={0}
              max={MAX_BLEND_WEIGHT}
              step={0.1}
              value={weight}
              onChange={(e) => setWeight(layer, Number(e.target.value))}
              className="w-full"
            />
          </div>
        );
      })}

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onToggleOverlay}
          aria-pressed={overlayOn}
          className={`rounded border px-1.5 py-0.5 font-medium ${
            overlayOn
              ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
              : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
          }`}
        >
          {overlayOn ? "Showing your blend on the map — remove" : "Show your blend on the map"}
        </button>
        {overlayOn && (
          // A real gap found live by this project's own QA sweep: /advanced's
          // MapLayerControls already marks a custom overlay with an asterisk
          // ("A custom overlay you defined -- not one of the shipped/
          // validated scores"), but this simple root view had no equivalent
          // marker anywhere -- the blend silently colored the map with no
          // visible indication it wasn't a real, shipped layer.
          <span className="text-amber-600 dark:text-amber-500" title="A custom overlay you defined -- not one of the shipped/validated scores" data-testid="custom-blend-asterisk">
            *
          </span>
        )}
      </div>

      {!selectedCityId ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          The toggle above already works map-wide. Click a city to see its blended value here too.
        </p>
      ) : (
        <p className="text-zinc-600 dark:text-zinc-400">
          Your blend for this city:{" "}
          <b className="text-zinc-800 dark:text-zinc-100">{blendValue !== null ? blendValue.toFixed(1) : "no data"}</b>
        </p>
      )}
    </div>
  );
}
