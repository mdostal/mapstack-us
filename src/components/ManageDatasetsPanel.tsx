"use client";

import { DATASETS } from "@/lib/datasets/registry";

interface Props {
  hiddenIds: string[];
  onChange: (hiddenIds: string[]) => void;
}

/**
 * A checklist to hide datasets you don't care about from the "+ Add
 * layer"/Layers pickers -- pure declutter, not a data toggle. A hidden
 * dataset's layers, if already active, stay active and keep showing
 * everywhere else (map, table, CSV, legends) -- see
 * lib/dataset-visibility.ts's own doc comment for why that's safe.
 * Shared between the simple view (MapstackApp.tsx) and /advanced
 * (PowerUserPanel.tsx) so hiding a dataset in one place is consistent
 * with the other -- both read/write the same localStorage key.
 */
export function ManageDatasetsPanel({ hiddenIds, onChange }: Props) {
  function toggle(id: string) {
    onChange(hiddenIds.includes(id) ? hiddenIds.filter((h) => h !== id) : [...hiddenIds, id]);
  }

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">
        Uncheck a dataset to hide it from the add-layer pickers. Layers you&apos;ve already added
        stay active either way.
      </p>
      {DATASETS.map((dataset) => {
        const hidden = hiddenIds.includes(dataset.id);
        return (
          <label
            key={dataset.id}
            htmlFor={`manage-dataset-${dataset.id}`}
            className="flex items-center gap-2 rounded px-1 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            <input
              id={`manage-dataset-${dataset.id}`}
              type="checkbox"
              checked={!hidden}
              onChange={() => toggle(dataset.id)}
            />
            {dataset.label}
          </label>
        );
      })}
    </div>
  );
}
