"use client";

import { useState } from "react";
import Link from "next/link";
import { AddLayerPanel } from "@/components/AddLayerPanel";
import { ActiveLayersList } from "@/components/ActiveLayersList";
import { MultiLayerMap } from "@/components/MultiLayerMap";
import { LayerLegends } from "@/components/LayerLegends";
import { CityDetailPanel } from "@/components/CityDetailPanel";
import { YearControl } from "@/components/YearControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isSameLayer, type ActiveLayer } from "@/lib/active-layers";
import { DATASETS } from "@/lib/datasets/registry";
import { useSharedViewParams } from "@/lib/shared-view-params";

const DEFAULT_LAYER: ActiveLayer = { datasetId: "allergy", layerId: "grass" };

export function MapstackApp() {
  const [active, setActive] = useState<ActiveLayer[]>(DATASETS.length > 0 ? [DEFAULT_LAYER] : []);
  const { cityId: selectedCityId, year, setCityId: setSelectedCityId, setYear, queryString } = useSharedViewParams();

  function addLayer(layer: ActiveLayer) {
    setActive((prev) => (prev.some((a) => isSameLayer(a, layer)) ? prev : [...prev, layer]));
  }

  function removeLayer(layer: ActiveLayer) {
    setActive((prev) => prev.filter((a) => !isSameLayer(a, layer)));
  }

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3 px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mapstack
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Open-source US map layers. Add any dataset as a layer, stack as many as you want,
            click a city.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href={`/advanced${queryString}`} prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Advanced
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6 md:flex-row">
        <div className="flex flex-col gap-4 overflow-y-auto md:top-6 md:h-[calc(100vh-4.5rem)] md:w-72 md:flex-shrink-0 md:sticky">
          <div className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Active layers
            </h2>
            <ActiveLayersList active={active} onRemove={removeLayer} />
          </div>

          <AddLayerPanel active={active} onAdd={addLayer} />

          <CityDetailPanel cityId={selectedCityId} active={active} year={year} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="max-h-40 w-56 flex-shrink-0 overflow-y-auto">
              <LayerLegends active={active} />
            </div>
            <YearControl active={active} year={year} onChange={setYear} />
          </div>
          <MultiLayerMap
            active={active}
            year={year}
            onSelectCity={setSelectedCityId}
            selectedCityId={selectedCityId}
          />
        </div>
      </div>
    </main>
  );
}
