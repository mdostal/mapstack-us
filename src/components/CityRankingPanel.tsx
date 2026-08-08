"use client";

import { useMemo, useState } from "react";
import { computeBlendValue, type BlendWeights } from "@/lib/custom-blend";
import type { ActiveLayer } from "@/lib/active-layers";
import type { DatasetTimeContext } from "@/lib/datasets/types";
import cities from "@data/cities.json";

interface Props {
  active: ActiveLayer[];
  year: number | null;
  weights: BlendWeights;
  onSelectCity: (cityId: string) => void;
  /** Rank only these cities (e.g. the comparison set) instead of the full
   * 512-city spine. Omit to rank everyone. */
  cityIds?: string[];
}

const CITY_LIST = cities as { id: string; city: string; state: string }[];
const DEFAULT_VISIBLE = 25;

/**
 * Ranks cities by the SAME user-defined blend CustomBlendPanel already
 * computes -- explicit user direction: "score all cities based on the
 * choices you made." This is a genuinely new capability (the blend was
 * previously display-only, deliberately never feeding a sort -- see
 * lib/custom-blend.ts's own doc comment on why blending is opt-in and
 * user-owned). Ranking by it is a natural extension of that same
 * principle, not a reversal: the weights are still 100% the user's own
 * choice, this just also lets them see the result as an ordered list
 * instead of one city at a time.
 */
export function CityRankingPanel({ active, year, weights, onSelectCity, cityIds }: Props) {
  const [ascending, setAscending] = useState(true);
  const [visibleCount, setVisibleCount] = useState(DEFAULT_VISIBLE);

  const ranked = useMemo(() => {
    if (active.length === 0) return [];
    const context: DatasetTimeContext | undefined = year !== null ? { year } : undefined;
    const pool = cityIds ? CITY_LIST.filter((c) => cityIds.includes(c.id)) : CITY_LIST;
    return pool
      .map((city) => ({ city, score: computeBlendValue(city.id, active, weights, context) }))
      .filter((r): r is { city: (typeof CITY_LIST)[number]; score: number } => r.score !== null)
      .sort((a, b) => (ascending ? a.score - b.score : b.score - a.score));
  }, [active, year, weights, cityIds, ascending]);

  if (active.length === 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">Add at least one layer to rank cities by it.</p>;
  }

  return (
    <div className="flex flex-col gap-2 text-xs">
      <div className="flex items-center justify-between">
        <p className="text-zinc-500 dark:text-zinc-400">
          {ranked.length} {cityIds ? "compared" : "real"} cities scored, using your active layers
          {Object.keys(weights).length > 0 ? " and your blend weights" : " at equal weight"}.
        </p>
        <button
          type="button"
          onClick={() => setAscending((v) => !v)}
          className="shrink-0 rounded border border-zinc-200 px-1.5 py-0.5 font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {ascending ? "Best first" : "Worst first"}
        </button>
      </div>
      <ol data-testid="city-ranking-list" className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800">
        {ranked.slice(0, visibleCount).map((r, i) => (
          <li key={r.city.id} className="flex items-center justify-between gap-2 py-1">
            <button
              type="button"
              onClick={() => onSelectCity(r.city.id)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left hover:underline"
            >
              <span className="w-6 shrink-0 text-right text-zinc-400 dark:text-zinc-500">{i + 1}</span>
              <span className="truncate text-zinc-800 dark:text-zinc-100">
                {r.city.city}, {r.city.state}
              </span>
            </button>
            <span className="shrink-0 font-medium text-zinc-600 dark:text-zinc-300">{r.score.toFixed(1)}</span>
          </li>
        ))}
      </ol>
      {ranked.length > visibleCount && (
        <button
          type="button"
          onClick={() => setVisibleCount((v) => v + 50)}
          className="self-start text-zinc-500 underline hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Show 50 more ({ranked.length - visibleCount} remaining)
        </button>
      )}
    </div>
  );
}
