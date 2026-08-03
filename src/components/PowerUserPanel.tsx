"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { AccordionSection } from "@/components/AccordionSection";
import { LayerPicker } from "@/components/LayerPicker";
import { ComparisonTable } from "@/components/ComparisonTable";
import { SavedViewsPanel } from "@/components/SavedViewsPanel";
import { FormulaPanel } from "@/components/FormulaPanel";
import { CitySearch } from "@/components/CitySearch";
import { FilterPopover } from "@/components/FilterPopover";
import { InsightsPanel } from "@/components/InsightsPanel";
import { InsightsDock } from "@/components/InsightsDock";
import { MultiLayerMap } from "@/components/MultiLayerMap";
import { MapLayerControls } from "@/components/MapLayerControls";
import { CityDetailPanel } from "@/components/CityDetailPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { YearControl } from "@/components/YearControl";
import { isSameLayer, type ActiveLayer } from "@/lib/active-layers";
import { notifySharedViewParamsChanged, useSharedViewParams } from "@/lib/shared-view-params";
import type { SortSpec } from "@/lib/power-user/resolve-sort-keys";
import { buildComparisonCsv } from "@/lib/power-user/build-comparison-csv";
import { downloadCsv } from "@/lib/power-user/csv-export";
import { decodeView, encodeView, VIEW_PARAM } from "@/lib/url-state";
import type { SavedView } from "@/lib/saved-views";
import { DEFAULT_LAYER_CONTROL, type LayerRenderControl } from "@/lib/map-layers";
import { DEFAULT_WEIGHTS, getGrassComponents, recomputeGrassScore, type ComponentWeights } from "@/lib/formula/allergy-grass-formula";

const GRASS_LAYER: ActiveLayer = { datasetId: "allergy", layerId: "grass" };

const DEFAULT_SELECTION: ActiveLayer[] = [
  { datasetId: "allergy", layerId: "grass" },
  { datasetId: "crime", layerId: "violent_crime" },
];

/**
 * The power-user tab (/mapstack/advanced): transparent per-city comparison
 * across 2+ datasets, no computed cross-dataset score. See
 * .pHive/epics/power-user-tab/docs/design-discussion.md for the full
 * rationale, including why a combined ranking was deliberately dropped
 * after the grill pass (findings U1/P1).
 *
 * Layout: a synthesis of three reviewed wireframe options, split by what
 * each panel *is* -- things you set (search, filter) live in a top
 * toolbar; things you manage/review (layers, saved views) live in a left
 * accordion sidebar; a result you read (insights) docks under the table.
 * See .pHive/design/power-user-advanced-layout/brief.md.
 */
export function PowerUserPanel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore a shared view from the `view` URL param on first load, if present
  // and valid -- fails open to the default selection otherwise (pu-4).
  const viewParam = searchParams.get(VIEW_PARAM);
  const decoded = viewParam ? decodeView(viewParam) : null;

  const [selected, setSelected] = useState<ActiveLayer[]>(decoded?.selections.length ? decoded.selections : DEFAULT_SELECTION);
  const [sortKeys, setSortKeys] = useState<SortSpec[]>(decoded?.sortKeys ?? []);
  // LayerPicker computes which dataset groups start expanded ONCE at mount
  // (deliberately non-reactive -- see its own doc comment: collapsing a
  // group you're not using shouldn't silently reopen just because
  // selection changes elsewhere). Restoring a saved view is a real
  // exception to that: it's a discrete bulk-apply action, and a group that
  // just gained a selection from it should visibly open, not stay
  // collapsed showing no sign anything changed. Bumping this key forces
  // LayerPicker to remount (and its groups to recompute) only on restore,
  // never on ordinary checkbox interaction.
  const [restoreVersion, setRestoreVersion] = useState(0);
  const [filteredCityIds, setFilteredCityIds] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const { cityId: selectedCityId, year, setCityId: setSelectedCityId, setYear, queryString } = useSharedViewParams();

  // Per-layer map render controls (visible/inverted/opacity) -- independent
  // of `selected`: hiding or inverting a layer on the map never touches the
  // table/CSV/filter/sort, which always use every selected layer. See
  // MapLayerControls.tsx / lib/map-layers.ts.
  const [layerControls, setLayerControls] = useState<Record<string, LayerRenderControl>>({});
  const getLayerControl = useCallback((key: string) => layerControls[key] ?? DEFAULT_LAYER_CONTROL, [layerControls]);
  function updateLayerControl(key: string, patch: Partial<LayerRenderControl>) {
    setLayerControls((prev) => ({ ...prev, [key]: { ...(prev[key] ?? DEFAULT_LAYER_CONTROL), ...patch } }));
  }

  // The Formula panel's live grass overlay -- real (shipped) data stays the
  // primary "Grass" layer; this is an ADDITIONAL, explicitly asterisked
  // layer only rendered while grass is both selected and toggled on. See
  // FormulaPanel.tsx / .pHive/design/power-user-formula-panel/design-note.md.
  const [grassWeights, setGrassWeights] = useState<ComponentWeights>(DEFAULT_WEIGHTS);
  const [grassOverlayOn, setGrassOverlayOn] = useState(false);
  const grassSelected = selected.some((s) => isSameLayer(s, GRASS_LAYER));
  const customOverlay = useMemo(() => {
    if (!grassOverlayOn || !grassSelected) return null;
    return {
      label: "Allergy severity: Grass (your weights)",
      getValue: (cityId: string) => {
        const components = getGrassComponents(cityId);
        return components ? recomputeGrassScore(components, grassWeights) : null;
      },
    };
  }, [grassOverlayOn, grassSelected, grassWeights]);

  function toggle(layer: ActiveLayer) {
    setSelected((prev) =>
      prev.some((s) => isSameLayer(s, layer)) ? prev.filter((s) => !isSameLayer(s, layer)) : [...prev, layer],
    );
  }

  function clearAllLayers() {
    setSelected([]);
  }

  function restoreSavedView(view: SavedView) {
    setSelected(view.selections);
    setSortKeys(view.sortKeys);
    setRestoreVersion((v) => v + 1);
    // Also reflect the restored view in the URL so it's shareable, not just
    // applied in-memory -- see .pHive/design/power-user-saved-views/brief.md.
    // Written via window.history.replaceState directly, NOT next/navigation's
    // router.replace() -- see shared-view-params.ts's doc comment for the
    // real production bug (an RSC-fetch 404 through this app's multi-zone
    // rewrite) this avoids. Reads window.location.search rather than this
    // component's own `searchParams` for the same reason: shared-view-params.ts's
    // city/year writes no longer go through Next's router, so `searchParams`
    // (only ever updated by a REAL Next navigation) would otherwise go stale
    // the moment a user selects a city, silently dropping it from this URL.
    const params = new URLSearchParams(window.location.search);
    params.set(VIEW_PARAM, encodeView({ selections: view.selections, sortKeys: view.sortKeys }));
    window.history.replaceState(window.history.state, "", `${pathname}?${params.toString()}`);
    notifySharedViewParamsChanged();
  }

  function exportCsv() {
    const csv = buildComparisonCsv(selected, year, sortKeys, filteredCityIds);
    downloadCsv(`mapstack-comparison-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-start justify-between gap-3 px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mapstack — Advanced
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Compare 2+ datasets side by side, city by city — every value labeled with its own
            methodology. No combined score: see{" "}
            <a
              href="https://github.com/mdostal/mapstack-us/blob/main/.pHive/epics/power-user-tab/docs/design-discussion.md"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              why
            </a>
            .
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearControl active={selected} year={year} onChange={setYear} />
          <Link href={`/${queryString}`} prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Simple view
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:flex-row">
        <div className="flex flex-col gap-3 overflow-y-auto md:top-6 md:h-[calc(100vh-4.5rem)] md:w-64 md:flex-shrink-0 md:sticky">
          <AccordionSection title="Layers" defaultOpen>
            <LayerPicker key={restoreVersion} selected={selected} onToggle={toggle} onClearAll={clearAllLayers} />
          </AccordionSection>
          <AccordionSection title="Saved views">
            <SavedViewsPanel currentSelections={selected} currentSortKeys={sortKeys} onRestore={restoreSavedView} />
          </AccordionSection>
          <AccordionSection title="Formula">
            <FormulaPanel
              selected={selected}
              selectedCityId={selectedCityId}
              grassWeights={grassWeights}
              onGrassWeightsChange={setGrassWeights}
              grassOverlayOn={grassOverlayOn}
              onToggleGrassOverlay={() => setGrassOverlayOn((v) => !v)}
            />
          </AccordionSection>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div role="tablist" aria-label="View" className="flex gap-1 rounded-md border border-zinc-200 p-0.5 dark:border-zinc-800">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "map"}
                onClick={() => setViewMode("map")}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  viewMode === "map"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Map
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === "table"}
                onClick={() => setViewMode("table")}
                className={`rounded px-2 py-1 text-xs font-medium ${
                  viewMode === "table"
                    ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Table
              </button>
            </div>
            <CitySearch onSelectCity={setSelectedCityId} />
            <FilterPopover
              selected={selected}
              year={year}
              isActive={filteredCityIds !== null}
              onFilterChange={setFilteredCityIds}
            />
            <span className="flex-1" />
            {viewMode === "table" && (
              <button
                type="button"
                onClick={exportCsv}
                className="rounded border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                Export CSV
              </button>
            )}
          </div>

          {viewMode === "map" ? (
            <div className="flex flex-1 flex-col gap-2">
              <MapLayerControls
                active={selected}
                customOverlayLabel={customOverlay?.label ?? null}
                getControl={getLayerControl}
                onChange={updateLayerControl}
              />
              <MultiLayerMap
                active={selected}
                year={year}
                onSelectCity={setSelectedCityId}
                selectedCityId={selectedCityId}
                customOverlay={customOverlay}
                getLayerControl={getLayerControl}
              />
              {/* Confirms which city is selected on the map -- Table view has
                 row highlighting for this, Map view previously had nothing.
                 Explicit operator feedback: "how do I know what city I
                 selected?" Reuses the simple view's own detail panel rather
                 than building a second one. */}
              {selectedCityId ? (
                <CityDetailPanel cityId={selectedCityId} active={selected} year={year} />
              ) : (
                <p className="text-xs text-zinc-400 dark:text-zinc-600">
                  Click a city on the map to see its values here.
                </p>
              )}
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                Layers render independently, each its own gradient — a visual overlay, not a
                computed blend: no layer&apos;s value is ever combined into another&apos;s.
                Visibility, invert, and opacity above are display-only: they change what the map
                shows, never the table, CSV export, sort, or filter.
                {customOverlay && " * uses your custom formula weights, not the shipped/validated score."}
              </p>
            </div>
          ) : (
            <ComparisonTable
              selected={selected}
              year={year}
              selectedCityId={selectedCityId}
              onSelectCity={setSelectedCityId}
              sortKeys={sortKeys}
              onSortKeysChange={setSortKeys}
              visibleCityIds={filteredCityIds}
            />
          )}

          {/* Insights (and, by extension, methodology/legend context) are
             cross-cutting -- Map and Table are just two ways of displaying
             the same selected layers, so this shouldn't disappear when you
             switch views. Explicit operator direction. */}
          <InsightsDock>
            <InsightsPanel selected={selected} year={year} onSelectCity={setSelectedCityId} />
          </InsightsDock>
        </div>
      </div>
    </main>
  );
}
