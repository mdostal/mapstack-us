"use client";

import { DATASETS } from "@/lib/datasets/registry";
import { activeLayerKey, isSameLayer, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  selected: ActiveLayer[];
  onToggle: (layer: ActiveLayer) => void;
}

/**
 * Checkbox tree for the power-user comparison table: dataset -> layers,
 * multi-select (unlike AddLayerPanel's single-tab-at-a-time add flow).
 * Interaction shape reviewed from allergy-locator's ProfileCompare.tsx
 * checkbox list (design-discussion.md open question 4).
 */
export function LayerPicker({ selected, onToggle }: Props) {
  return (
    <div className="flex flex-col gap-3">
      {DATASETS.map((dataset) => (
        <fieldset key={dataset.id} className="flex flex-col gap-1">
          <legend className="text-xs font-medium text-zinc-700 dark:text-zinc-300">{dataset.label}</legend>
          {dataset.layers.map((layer) => {
            const candidate: ActiveLayer = { datasetId: dataset.id, layerId: layer.id };
            const key = activeLayerKey(candidate);
            const checked = selected.some((s) => isSameLayer(s, candidate));
            return (
              <label
                key={key}
                htmlFor={`layer-picker-${key}`}
                className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <input
                  id={`layer-picker-${key}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggle(candidate)}
                />
                {layer.label}
              </label>
            );
          })}
        </fieldset>
      ))}
    </div>
  );
}
