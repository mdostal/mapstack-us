"use client";

import { useState } from "react";
import { DATASETS } from "@/lib/datasets/registry";
import { activeLayerKey, isSameLayer, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  selected: ActiveLayer[];
  onToggle: (layer: ActiveLayer) => void;
  onClearAll: () => void;
}

function datasetHasLayer(datasetId: string, layerId: string, selected: ActiveLayer[]): boolean {
  return selected.some((s) => isSameLayer(s, { datasetId, layerId }));
}

/**
 * Checkbox tree for the power-user comparison table: dataset -> layers,
 * multi-select (unlike AddLayerPanel's single-tab-at-a-time add flow).
 * Interaction shape reviewed from allergy-locator's ProfileCompare.tsx
 * checkbox list (design-discussion.md open question 4).
 *
 * Each dataset is its own collapsible group -- allergy alone has 29 layers,
 * and the backlog (.pHive/epics/data-store/docs/dataset-backlog.md) plans
 * for 10+ datasets total, so a flat always-expanded list doesn't scale.
 * Defaults: a dataset with an active selection starts expanded (so what's
 * on screen is visible at a glance); an unselected dataset starts collapsed.
 * That default is set ONCE at mount, not reactively -- toggling a group
 * afterward is purely the user's call even if selection changes later, so
 * collapsing a dataset you're not using doesn't get silently reopened.
 *
 * "Clear all" resets the selection to empty -- lets someone start from
 * nothing and pick just one dataset's layers (e.g. "only crime") rather
 * than always pruning down from the app's 2-layer default.
 */
export function LayerPicker({ selected, onToggle, onClearAll }: Props) {
  const [openDatasets, setOpenDatasets] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      DATASETS.map((dataset) => [
        dataset.id,
        dataset.layers.some((layer) => datasetHasLayer(dataset.id, layer.id, selected)),
      ]),
    ),
  );

  function toggleDataset(datasetId: string) {
    setOpenDatasets((prev) => ({ ...prev, [datasetId]: !prev[datasetId] }));
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClearAll}
          className="self-start text-xs text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Clear all
        </button>
      )}
      <div className="flex flex-col gap-1">
        {DATASETS.map((dataset) => {
          const isOpen = openDatasets[dataset.id] ?? false;
          const selectedCount = dataset.layers.filter((layer) => datasetHasLayer(dataset.id, layer.id, selected)).length;
          return (
            <div key={dataset.id} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => toggleDataset(dataset.id)}
                aria-expanded={isOpen}
                className="flex items-center justify-between gap-1 rounded px-1 py-0.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="text-zinc-400">
                    {isOpen ? "▾" : "▸"}
                  </span>
                  {dataset.label}
                </span>
                {selectedCount > 0 && (
                  <span
                    aria-hidden
                    className="rounded-full bg-zinc-200 px-1.5 text-[10px] font-normal leading-tight text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300"
                  >
                    {selectedCount}
                  </span>
                )}
              </button>
              {isOpen && (
                <div className="flex flex-col gap-0.5 pl-4">
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
