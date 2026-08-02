"use client";

import { useState } from "react";
import { DATASETS } from "@/lib/datasets/registry";
import { activeLayerKey, isSameLayer, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  onAdd: (layer: ActiveLayer) => void;
}

/**
 * "Add layer" flow: pick a dataset, then pick one of its layers to add to
 * the map -- explicit user direction: "I should be able to add an allergy
 * layer, then add a crime layer, then add the hospital healthcare layer
 * etc." Already-active layers show as checked/disabled rather than being
 * hidden, so it's clear at a glance what's already on the map.
 */
export function AddLayerPanel({ active, onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [datasetId, setDatasetId] = useState(DATASETS[0]?.id ?? "");
  const dataset = DATASETS.find((d) => d.id === datasetId);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-zinc-900 dark:text-zinc-50"
      >
        <span>+ Add layer</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          <div role="tablist" aria-label="Dataset to add from" className="flex gap-1">
            {DATASETS.map((d) => (
              <button
                key={d.id}
                type="button"
                role="tab"
                aria-selected={datasetId === d.id}
                onClick={() => setDatasetId(d.id)}
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
              return (
                <button
                  key={activeLayerKey(candidate)}
                  type="button"
                  disabled={alreadyActive}
                  onClick={() => onAdd(candidate)}
                  aria-label={alreadyActive ? `${layer.label} (already added)` : layer.label}
                  className="flex items-center justify-between rounded px-2 py-1.5 text-left text-xs text-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
        </div>
      )}
    </div>
  );
}
