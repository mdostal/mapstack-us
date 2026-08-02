"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { ThemeToggle } from "@/components/ThemeToggle";
import { YearControl } from "@/components/YearControl";
import { isSameLayer, type ActiveLayer } from "@/lib/active-layers";
import { useSharedViewParams } from "@/lib/shared-view-params";
import type { SortDirection } from "@/lib/power-user/sort";
import { buildComparisonCsv } from "@/lib/power-user/build-comparison-csv";
import { downloadCsv } from "@/lib/power-user/csv-export";
import { decodeView, encodeView, VIEW_PARAM } from "@/lib/url-state";
import type { SavedView } from "@/lib/saved-views";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Restore a shared view from the `view` URL param on first load, if present
  // and valid -- fails open to the default selection otherwise (pu-4).
  const viewParam = searchParams.get(VIEW_PARAM);
  const decoded = viewParam ? decodeView(viewParam) : null;

  const [selected, setSelected] = useState<ActiveLayer[]>(decoded?.selections.length ? decoded.selections : DEFAULT_SELECTION);
  const [sortBy, setSortBy] = useState<ActiveLayer | null>(decoded?.sortBy ?? null);
  const [direction, setDirection] = useState<SortDirection>(decoded?.direction ?? "asc");
  const [filteredCityIds, setFilteredCityIds] = useState<Set<string> | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "map">("table");
  const { cityId: selectedCityId, year, setCityId: setSelectedCityId, setYear, queryString } = useSharedViewParams();

  function toggle(layer: ActiveLayer) {
    setSelected((prev) =>
      prev.some((s) => isSameLayer(s, layer)) ? prev.filter((s) => !isSameLayer(s, layer)) : [...prev, layer],
    );
  }

  function restoreSavedView(view: SavedView) {
    setSelected(view.selections);
    setSortBy(view.sortBy);
    setDirection(view.direction);
    // Also reflect the restored view in the URL so it's shareable, not just
    // applied in-memory -- see .pHive/design/power-user-saved-views/brief.md.
    const params = new URLSearchParams(searchParams.toString());
    params.set(VIEW_PARAM, encodeView({ selections: view.selections, sortBy: view.sortBy, direction: view.direction }));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function exportCsv() {
    const csv = buildComparisonCsv(selected, year, sortBy, direction, filteredCityIds);
    downloadCsv(`mapstack-comparison-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-6 pt-8">
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
          <Link href={`/${queryString}`} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Simple view
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:flex-row">
        <div className="flex flex-col gap-3 md:w-64 md:flex-shrink-0">
          <AccordionSection title="Layers" defaultOpen>
            <LayerPicker selected={selected} onToggle={toggle} />
          </AccordionSection>
          <AccordionSection title="Saved views">
            <SavedViewsPanel
              currentSelections={selected}
              currentSortBy={sortBy}
              currentDirection={direction}
              onRestore={restoreSavedView}
            />
          </AccordionSection>
          <AccordionSection title="Formula">
            <FormulaPanel selected={selected} selectedCityId={selectedCityId} />
          </AccordionSection>
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-2">
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
              <MultiLayerMap
                active={selected}
                year={year}
                onSelectCity={setSelectedCityId}
                selectedCityId={selectedCityId}
              />
              <p className="text-xs text-zinc-400 dark:text-zinc-600">
                Layers render independently, each its own gradient. With 2+ active, every layer
                renders at 65% opacity so they&apos;re visible together — that&apos;s a visual
                overlay, not a computed blend: no layer&apos;s value is ever combined into
                another&apos;s.
              </p>
            </div>
          ) : (
            <>
              <ComparisonTable
                selected={selected}
                year={year}
                selectedCityId={selectedCityId}
                onSelectCity={setSelectedCityId}
                sortBy={sortBy}
                direction={direction}
                onSortChange={(nextSortBy, nextDirection) => {
                  setSortBy(nextSortBy);
                  setDirection(nextDirection);
                }}
                visibleCityIds={filteredCityIds}
              />

              <InsightsDock>
                <InsightsPanel selected={selected} year={year} onSelectCity={setSelectedCityId} />
              </InsightsDock>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
