"use client";

import { useMemo } from "react";
import { TrendChart, type TrendSeries } from "@/components/TrendChart";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer, type ResolvedActiveLayer } from "@/lib/active-layers";
import { baseColorForIndex } from "@/lib/palette/ramps";
import cities from "@data/cities.json";

const CITY_BY_ID = new Map(cities.map((c) => [c.id, c]));

interface Props {
  cityIds: string[];
  active: ActiveLayer[];
}

/**
 * A real historical trend, year by year, for whichever ACTIVE layers
 * actually have multi-year data (`Dataset.availableYears.length > 1`) --
 * currently only Crime (2010-2025, scripts/gen_crime_data.py). Every
 * other layer in this app is a real but current-snapshot-only source, so
 * rather than fabricate a flat "unchanged" line to fill out a chart for
 * them, this panel simply doesn't plot one, and says so explicitly when
 * none of the active layers qualify. Direct response to "get a chart over
 * the years... show how austin ranked 15 years ago" -- real for the one
 * metric that actually has real history, honest about the rest instead
 * of implying a false multi-year trend everywhere.
 */
export function TrendReportPanel({ cityIds, active }: Props) {
  const timeCapableLayers = useMemo(
    () =>
      active
        .map((a) => resolveActiveLayer(a))
        .filter((r): r is ResolvedActiveLayer => r !== null && (r.dataset.availableYears?.length ?? 0) > 1),
    [active],
  );

  const cityList = cityIds.map((id) => CITY_BY_ID.get(id)).filter((c): c is NonNullable<typeof c> => !!c);
  if (cityList.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-800">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Historical trend
      </h2>
      {timeCapableLayers.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          No historical trend to show yet. Every layer here except <span className="font-medium">Crime</span> is a
          real current-snapshot source -- it has no multi-year history to plot, and this app won&apos;t invent one.
          Add a Crime layer (violent or property) to see a real year-by-year trend for these cities.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {timeCapableLayers.map((resolved) => {
            const years = resolved.dataset.availableYears!;
            const series: TrendSeries[] = cityList.map((city, index) => ({
              label: `${city.city}, ${city.state}`,
              color: baseColorForIndex(index, cityList.length),
              points: years
                .map((year) => {
                  const result = resolved.dataset.getValue(city.id, resolved.layer.id, { year });
                  return result ? { x: year, y: result.value } : null;
                })
                .filter((p): p is { x: number; y: number } => p !== null),
            }));

            return (
              <div key={activeLayerKey(resolved)}>
                <p className="mb-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  {resolved.dataset.label}: {resolved.layer.label} -- real data, {years[0]}–{years[years.length - 1]}
                </p>
                <TrendChart series={series} years={years} yLabel="Concern percentile (higher = more concerning)" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
