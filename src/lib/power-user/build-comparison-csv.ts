import cities from "@data/cities.json";
import { resolveActiveLayer, isSameLayer, type ActiveLayer } from "@/lib/active-layers";
import { sortByValue, type SortDirection } from "@/lib/power-user/sort";
import { buildCsv } from "@/lib/power-user/csv-export";
import type { DatasetTimeContext } from "@/lib/datasets/types";

/**
 * Builds the export-ready CSV for the current comparison state -- same
 * selection/filter/sort semantics ComparisonTable renders, extracted so the
 * toolbar's Export button (src/components/PowerUserPanel.tsx) doesn't need
 * to duplicate ComparisonTable's internals. See
 * .pHive/design/power-user-advanced-layout/brief.md.
 */
export function buildComparisonCsv(
  selected: ActiveLayer[],
  year: number | null,
  sortBy: ActiveLayer | null,
  direction: SortDirection,
  visibleCityIds: Set<string> | null,
): string {
  const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;
  const columns = selected.map((item) => ({ item, resolved: resolveActiveLayer(item) })).filter((c) => c.resolved);

  const baseCities = visibleCityIds ? cities.filter((c) => visibleCityIds.has(c.id)) : cities;
  const sortColumn = sortBy ? columns.find((c) => isSameLayer(c.item, sortBy)) : undefined;
  const sortedCities = sortColumn
    ? sortByValue(
        baseCities,
        (city) => sortColumn.resolved!.dataset.getValue(city.id, sortColumn.resolved!.layer.id, context)?.value ?? null,
        direction,
      )
    : baseCities;

  return buildCsv(
    sortedCities.map((city) => ({ id: city.id, label: `${city.city}, ${city.state}` })),
    columns.map(({ resolved }) => ({
      header: `${resolved!.dataset.label}: ${resolved!.layer.label}`,
      getValue: (cityId: string) => resolved!.dataset.getValue(cityId, resolved!.layer.id, context)?.detail ?? "No data",
    })),
  );
}
