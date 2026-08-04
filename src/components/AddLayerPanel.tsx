"use client";

import { useState } from "react";
import { DATASETS } from "@/lib/datasets/registry";
import { activeLayerKey, isSameLayer, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  onAdd: (layer: ActiveLayer) => void;
  previewLayer: ActiveLayer | null;
  onPreview: (layer: ActiveLayer | null) => void;
  /** Dataset ids hidden via ManageDatasetsPanel -- pure declutter, see
   * lib/dataset-visibility.ts. Defaults to none hidden. */
  hiddenDatasetIds?: string[];
}

/**
 * "Add layer" flow: pick a dataset (the tab row), then pick one of its
 * layers -- explicit user direction: "I should be able to add an allergy
 * layer, then add a crime layer, then add the hospital healthcare layer
 * etc." Already-active layers show as checked/disabled rather than being
 * hidden, so it's clear at a glance what's already on the map.
 *
 * Two real bugs found live and fixed here: clicking a layer used to add it
 * immediately, with no way to see what it looked like on the map first and
 * no explicit confirming action -- now a click PREVIEWS the layer (live, on
 * the actual map, via MapstackApp's customOverlay slot -- see
 * MultiLayerMap.tsx) and a separate, solid "Add" button commits it. The
 * insertion-position bug (a newly added layer always landing at the very
 * bottom of Active Layers instead of grouped with same-dataset layers) was
 * a MapstackApp.tsx bug, fixed there in addLayer().
 */
export function AddLayerPanel({ active, onAdd, previewLayer, onPreview, hiddenDatasetIds = [] }: Props) {
  const visibleDatasets = DATASETS.filter((d) => !hiddenDatasetIds.includes(d.id));
  const [open, setOpen] = useState(false);
  const [datasetId, setDatasetId] = useState(visibleDatasets[0]?.id ?? "");
  const dataset = visibleDatasets.find((d) => d.id === datasetId) ?? visibleDatasets[0];
  const previewedLabel = previewLayer
    ? DATASETS.find((d) => d.id === previewLayer.datasetId)?.layers.find((l) => l.id === previewLayer.layerId)?.label
    : null;

  function togglePanel() {
    setOpen((v) => {
      if (v) onPreview(null);
      return !v;
    });
  }

  function selectDataset(id: string) {
    setDatasetId(id);
    onPreview(null);
  }

  function togglePreview(candidate: ActiveLayer) {
    onPreview(previewLayer && isSameLayer(previewLayer, candidate) ? null : candidate);
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50"
      >
        <span>+ Add layer</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>

      {open && visibleDatasets.length === 0 && (
        <p className="border-t border-zinc-200 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          Every dataset is hidden. Re-enable one in &quot;Manage datasets&quot; below to add a layer.
        </p>
      )}

      {open && visibleDatasets.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div role="tablist" aria-label="Dataset to add from" className="flex flex-wrap gap-1">
            {visibleDatasets.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={datasetId === d.id}
                onClick={() => selectDataset(d.id)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  datasetId === d.id
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>

          <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
            {dataset?.layers.map((layer) => {
              const candidate: ActiveLayer = { datasetId, layerId: layer.id };
              const alreadyActive = active.some((a) => isSameLayer(a, candidate));
              const isPreviewed = !alreadyActive && previewLayer !== null && isSameLayer(previewLayer, candidate);
              return (
                <button
                  key={activeLayerKey(candidate)}
                  type="button"
                  disabled={alreadyActive}
                  aria-pressed={isPreviewed}
                  onClick={() => togglePreview(candidate)}
                  aria-label={alreadyActive ? `${layer.label} (already added)` : layer.label}
                  className={`flex items-center justify-between rounded px-2 py-1.5 text-left text-xs disabled:cursor-not-allowed disabled:opacity-40 ${
                    isPreviewed
                      ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                      : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span aria-hidden>{layer.label}</span>
                  {alreadyActive && (
                    <span aria-hidden className="text-zinc-400">
                      Added
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            disabled={previewLayer === null}
            onClick={() => previewLayer && onAdd(previewLayer)}
            className="mt-1 rounded-md bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 dark:bg-zinc-50 dark:text-zinc-900 dark:disabled:bg-zinc-800 dark:disabled:text-zinc-600"
          >
            {previewedLabel ? `Add ${previewedLabel}` : "Select a layer above to preview it"}
          </button>
        </div>
      )}
    </div>
  );
}
