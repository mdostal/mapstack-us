"use client";

import { useState } from "react";
import { DatasetMap } from "@/components/DatasetMap";
import { GradientLegend } from "@/components/GradientLegend";
import { concernColor } from "@/lib/palette/ramps";
import type { Dataset } from "@/lib/datasets/types";
import cities from "@data/cities.json";

const CITY_BY_ID = new Map(cities.map((c) => [c.id, c]));

interface Props {
  dataset: Dataset;
}

/**
 * The generalized dataset UI shell: layer picker + legend + map + click-to-
 * detail panel, working for any Dataset (lib/datasets/types.ts). One layer
 * visible at a time -- see DatasetMap's own doc for why simultaneous
 * multi-layer overlay isn't attempted yet.
 */
export function DatasetView({ dataset }: Props) {
  const [layerId, setLayerId] = useState(dataset.layers[0]?.id ?? "");
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);

  const selectedCity = selectedCityId ? CITY_BY_ID.get(selectedCityId) : undefined;
  const selectedResult = selectedCityId ? dataset.getValue(selectedCityId, layerId) : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:flex-row">
      <div className="flex flex-col gap-4 md:w-64 md:flex-shrink-0">
        <div
          role="radiogroup"
          aria-label={`${dataset.label} layer`}
          className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-lg border border-zinc-200 p-2 dark:border-zinc-800"
        >
          {dataset.layers.map((layer) => (
            <button
              key={layer.id}
              type="button"
              role="radio"
              aria-checked={layerId === layer.id}
              onClick={() => setLayerId(layer.id)}
              className={`rounded-md px-3 py-1.5 text-left text-sm font-medium ${
                layerId === layer.id
                  ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {layer.label}
            </button>
          ))}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {dataset.description}{" "}
          <a
            href={dataset.methodologyUrl}
            className="text-blue-600 hover:underline dark:text-blue-400"
            target="_blank"
            rel="noreferrer"
          >
            Methodology
          </a>
          .
        </p>

        {selectedCity && (
          <div className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="font-semibold text-zinc-900 dark:text-zinc-50">
              {selectedCity.city}, {selectedCity.state}
            </p>
            <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
              {selectedResult ? selectedResult.detail : "No data for this layer."}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3">
        <div className="w-56">
          <GradientLegend label={`${dataset.layers.find((l) => l.id === layerId)?.label ?? ""} concern`} colorForValue={concernColor} />
        </div>
        <DatasetMap dataset={dataset} layerId={layerId} onSelectCity={setSelectedCityId} selectedCityId={selectedCityId} />
      </div>
    </div>
  );
}
