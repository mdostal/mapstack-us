"use client";

import type { Dataset } from "@/lib/datasets/types";

interface Props {
  datasets: Dataset[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function DatasetPicker({ datasets, activeId, onSelect }: Props) {
  return (
    <div role="tablist" aria-label="Dataset" className="flex gap-1 rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
      {datasets.map((dataset) => (
        <button
          key={dataset.id}
          type="button"
          role="tab"
          aria-selected={activeId === dataset.id}
          onClick={() => onSelect(dataset.id)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium ${
            activeId === dataset.id
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-600 dark:text-zinc-400"
          }`}
        >
          {dataset.label}
        </button>
      ))}
    </div>
  );
}
