"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { AddLayerPanel } from "@/components/AddLayerPanel";
import { ActiveLayersList } from "@/components/ActiveLayersList";
import { MultiLayerMap } from "@/components/MultiLayerMap";
import { LayerLegends } from "@/components/LayerLegends";
import { CityDetailPanel } from "@/components/CityDetailPanel";
import { CityComparisonPanel } from "@/components/CityComparisonPanel";
import { CityRankingPanel } from "@/components/CityRankingPanel";
import { CustomBlendPanel } from "@/components/CustomBlendPanel";
import { CitySearch } from "@/components/CitySearch";
import { InsightsDock } from "@/components/InsightsDock";
import { InsightsPanel } from "@/components/InsightsPanel";
import { YearControl } from "@/components/YearControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AccordionSection } from "@/components/AccordionSection";
import { ManageDatasetsPanel } from "@/components/ManageDatasetsPanel";
import { isSameLayer, resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";
import { DATASETS } from "@/lib/datasets/registry";
import { useSharedViewParams } from "@/lib/shared-view-params";
import { getHiddenDatasetIds, setHiddenDatasetIds } from "@/lib/dataset-visibility";
import { DEFAULT_LAYER_CONTROL, type LayerRenderControl } from "@/lib/map-layers";
import { computeBlendValue, type BlendWeights } from "@/lib/custom-blend";

const DEFAULT_LAYER: ActiveLayer = { datasetId: "allergy", layerId: "grass" };

// "A few" -- past this, the comparison table gets cramped and /advanced's
// full sortable/filterable table across all 512 cities is the right tool
// instead. Not URL-persisted (unlike the single selected city): a genuinely
// new, simple-view-only feature, kept as local state to avoid touching
// shared-view-params.ts's cross-route contract with /advanced.
const MAX_COMPARISON_CITIES = 4;

export function MapstackApp() {
  const [active, setActive] = useState<ActiveLayer[]>(DATASETS.length > 0 ? [DEFAULT_LAYER] : []);
  const [previewLayer, setPreviewLayer] = useState<ActiveLayer | null>(null);
  const [hiddenDatasetIds, setHiddenDatasetIdsState] = useState<string[]>(() => getHiddenDatasetIds());
  const [comparisonCityIds, setComparisonCityIds] = useState<string[]>([]);

  function addToComparison(cityId: string) {
    setComparisonCityIds((prev) => {
      if (prev.includes(cityId) || prev.length >= MAX_COMPARISON_CITIES) return prev;
      return [...prev, cityId];
    });
  }

  function removeFromComparison(cityId: string) {
    setComparisonCityIds((prev) => prev.filter((id) => id !== cityId));
  }

  // The same user-owned weighted blend CustomBlendPanel already computes in
  // /advanced (lib/custom-blend.ts) -- brought into simple view so ranking
  // ("score all cities based on the choices you made") has real weights to
  // work from, not just an unweighted average. Still 100% opt-in and
  // user-set: an empty weights object means every active layer counts
  // equally until the operator actually moves a slider.
  const [blendWeights, setBlendWeights] = useState<BlendWeights>({});
  const [blendOverlayOn, setBlendOverlayOn] = useState(false);

  function updateHiddenDatasetIds(ids: string[]) {
    setHiddenDatasetIdsState(ids);
    setHiddenDatasetIds(ids);
  }

  // Per-layer map visibility -- independent of `active`: hiding a layer on
  // the map keeps it in the Active layers list (and the click-to-detail
  // panel), so you can quickly flip layers on/off to compare without
  // re-adding them. Same LayerRenderControl shape /advanced's
  // MapLayerControls uses, but simple view only exposes the visibility
  // toggle -- explicit operator direction: keep simple view simple.
  const [layerControls, setLayerControls] = useState<Record<string, LayerRenderControl>>({});
  const getLayerControl = useCallback((key: string) => layerControls[key] ?? DEFAULT_LAYER_CONTROL, [layerControls]);
  const isLayerVisible = useCallback((key: string) => getLayerControl(key).visible, [getLayerControl]);
  function toggleLayerVisible(layer: ActiveLayer) {
    const key = activeLayerKey(layer);
    setLayerControls((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? DEFAULT_LAYER_CONTROL), visible: !(prev[key] ?? DEFAULT_LAYER_CONTROL).visible },
    }));
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

  const previewOverlay = useMemo(() => {
    if (!previewLayer) return null;
    const resolved = resolveActiveLayer(previewLayer);
    if (!resolved) return null;
    const context = year !== null ? { year } : undefined;
    return {
      key: "layer-preview",
      label: `Previewing: ${resolved.dataset.label}: ${resolved.layer.label}`,
      getValue: (cityId: string) => resolved.dataset.getValue(cityId, resolved.layer.id, context)?.value ?? null,
    };
  }, [previewLayer, year]);

  const blendOverlay = useMemo(() => {
    if (!blendOverlayOn || active.length < 2) return null;
    const context = year !== null ? { year } : undefined;
    return {
      key: "custom-blend-overlay",
      label: "Your custom blend",
      getValue: (cityId: string) => computeBlendValue(cityId, active, blendWeights, context),
    };
  }, [blendOverlayOn, active, blendWeights, year]);

  const customOverlays = useMemo(
    () => [previewOverlay, blendOverlay].filter((o) => o !== null),
    [previewOverlay, blendOverlay],
  );

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
            <ActiveLayersList
              active={active}
              onRemove={removeLayer}
              isVisible={isLayerVisible}
              onToggleVisible={toggleLayerVisible}
            />
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

          <AccordionSection title="Custom blend & ranking">
            <CustomBlendPanel
              selected={active}
              selectedCityId={selectedCityId}
              year={year}
              weights={blendWeights}
              onWeightsChange={setBlendWeights}
              overlayOn={blendOverlayOn}
              onToggleOverlay={() => setBlendOverlayOn((v) => !v)}
            />
            <div className="mt-3 border-t border-zinc-200 pt-3 dark:border-zinc-800">
              <p className="mb-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300">Rank all 512 cities</p>
              <CityRankingPanel active={active} year={year} weights={blendWeights} onSelectCity={setSelectedCityId} />
            </div>
          </AccordionSection>

          <CityDetailPanel
            cityId={selectedCityId}
            active={active}
            year={year}
            onAddToComparison={addToComparison}
            isInComparison={selectedCityId ? comparisonCityIds.includes(selectedCityId) : false}
            comparisonAtCap={comparisonCityIds.length >= MAX_COMPARISON_CITIES}
          />
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CitySearch onSelectCity={setSelectedCityId} />
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
            pinnedCityIds={comparisonCityIds}
            customOverlays={customOverlays}
            getLayerControl={getLayerControl}
          />
          {comparisonCityIds.length > 0 && (
            <div className="flex flex-col gap-3">
              <CityComparisonPanel
                cityIds={comparisonCityIds}
                active={active}
                year={year}
                onRemove={removeFromComparison}
                onClear={() => setComparisonCityIds([])}
              />
              {comparisonCityIds.length > 1 && (
                <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                    Rank the {comparisonCityIds.length} compared cities
                  </p>
                  <CityRankingPanel
                    active={active}
                    year={year}
                    weights={blendWeights}
                    onSelectCity={setSelectedCityId}
                    cityIds={comparisonCityIds}
                  />
                </div>
              )}
            </div>
          )}
          <InsightsDock>
            <InsightsPanel selected={active} year={year} onSelectCity={setSelectedCityId} />
          </InsightsDock>
        </div>
      </div>
    </main>
  );
}
