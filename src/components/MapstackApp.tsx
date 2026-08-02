"use client";

import { useState } from "react";
import { DatasetPicker } from "@/components/DatasetPicker";
import { DatasetView } from "@/components/DatasetView";
import { DATASETS, getDataset } from "@/lib/datasets/registry";
import { ThemeToggle } from "@/components/ThemeToggle";

export function MapstackApp() {
  const [activeId, setActiveId] = useState(DATASETS[0]?.id ?? "");
  const dataset = getDataset(activeId);

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mapstack
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Open-source US map layers. Pick a dataset, pick a layer, click a city.
          </p>
        </div>
        <ThemeToggle />
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <DatasetPicker datasets={DATASETS} activeId={activeId} onSelect={setActiveId} />
      </div>

      {/* key={dataset.id} forces a remount on dataset switch -- otherwise
          DatasetView keeps its previous dataset's layerId state (e.g.
          "grass"), which doesn't exist on the newly selected dataset's
          layers, leaving no layer selected and no data to render. */}
      {dataset && <DatasetView key={dataset.id} dataset={dataset} />}
    </main>
  );
}
