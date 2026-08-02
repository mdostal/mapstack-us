"use client";

import { resolveActiveLayer, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  active: ActiveLayer[];
  year: number | null;
  onChange: (year: number | null) => void;
}

/**
 * A single, shared year control for the whole map -- generalizes allergy-
 * locator's TimeframeControl/YearPlayback to work across ANY dataset that
 * reports real `availableYears` (lib/datasets/types.ts), not just allergy.
 * Offers the UNION of every active layer's dataset's real years -- a layer
 * whose dataset has no data for the selected year just shows "no data" for
 * that year, the same honest-gap handling used everywhere else, rather
 * than this control silently hiding/disabling itself per-layer.
 *
 * Hidden entirely when no active layer's dataset varies by year at all,
 * since offering a year picker with nothing real behind it would be a
 * decoration, not a feature.
 */
export function YearControl({ active, year, onChange }: Props) {
  const years = Array.from(
    new Set(
      active
        .map((item) => resolveActiveLayer(item)?.dataset.availableYears ?? [])
        .flat(),
    ),
  ).sort((a, b) => b - a);

  if (years.length === 0) return null;

  return (
    <label className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
      Year
      <select
        value={year ?? years[0]}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Year"
        className="rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
