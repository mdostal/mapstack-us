"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AddLayerPanel } from "@/components/AddLayerPanel";
import { ActiveLayersList } from "@/components/ActiveLayersList";
import { MultiLayerMap } from "@/components/MultiLayerMap";
import { LayerLegends } from "@/components/LayerLegends";
import { CityDetailPanel } from "@/components/CityDetailPanel";
import { YearControl } from "@/components/YearControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccordionSection } from "@/components/AccordionSection";
import { ManageDatasetsPanel } from "@/components/ManageDatasetsPanel";
import { isSameLayer, resolveActiveLayer, type ActiveLayer } from "@/lib/active-layers";
import { DATASETS } from "@/lib/datasets/registry";
import { useSharedViewParams } from "@/lib/shared-view-params";
import { getHiddenDatasetIds, setHiddenDatasetIds } from "@/lib/dataset-visibility";

const DEFAULT_LAYER: ActiveLayer = { datasetId: "allergy", layerId: "grass" };

export function MapstackApp() {
  const [active, setActive] = useState<ActiveLayer[]>(DATASETS.length > 0 ? [DEFAULT_LAYER] : []);
  const [previewLayer, setPreviewLayer] = useState<ActiveLayer | null>(null);
  const [hiddenDatasetIds, setHiddenDatasetIdsState] = useState<string[]>(() => getHiddenDatasetIds());

  function updateHiddenDatasetIds(ids: string[]) {
    setHiddenDatasetIdsState(ids);
    setHiddenDatasetIds(ids);
  }
  const { cityId: selectedCityId, year, setCityId: setSelectedCityId, setYear, queryString } = useSharedViewParams();

  function addLayer(layer: ActiveLayer) {
    setActive((prev) => {
      if (prev.some((a) => isSameLayer(a, layer))) return prev;
      // Insert right after the last layer from the SAME dataset (if any),
      // not always at the very end -- a real bug found live: adding a
      // second "Allergy severity" layer after an unrelated "Crime" layer
      // had already been added used to land the new allergy layer at the
      // bottom of the whole list, past Crime, instead of grouped with the
      // other allergy layer it actually belongs next to.
      let insertAt = prev.length;
      for (let i = prev.length - 1; i >= 0; i--) {
        if (prev[i].datasetId === layer.datasetId) {
          insertAt = i + 1;
          break;
        }
      }
      const next = [...prev];
      next.splice(insertAt, 0, layer);
      return next;
    });
    setPreviewLayer(null);
  }

  function removeLayer(layer: ActiveLayer) {
    setActive((prev) => prev.filter((a) => !isSameLayer(a, layer)));
  }

  const previewOverlays = useMemo(() => {
    if (!previewLayer) return [];
    const resolved = resolveActiveLayer(previewLayer);
    if (!resolved) return [];
    const context = year !== null ? { year } : undefined;
    return [
      {
        key: "layer-preview",
        label: `Previewing: ${resolved.dataset.label}: ${resolved.layer.label}`,
        getValue: (cityId: string) => resolved.dataset.getValue(cityId, resolved.layer.id, context)?.value ?? null,
      },
    ];
  }, [previewLayer, year]);

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

          <AddLayerPanel
            active={active}
            onAdd={addLayer}
            previewLayer={previewLayer}
            onPreview={setPreviewLayer}
            hiddenDatasetIds={hiddenDatasetIds}
          />

          <AccordionSection title="Manage datasets">
            <ManageDatasetsPanel hiddenIds={hiddenDatasetIds} onChange={updateHiddenDatasetIds} />
          </AccordionSection>

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
            customOverlays={previewOverlays}
          />
        </div>
      </div>
    </main>
  );
}
