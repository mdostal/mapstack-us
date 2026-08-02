"use client";

import { useState } from "react";
import Link from "next/link";
import { LayerPicker } from "@/components/LayerPicker";
import { ComparisonTable } from "@/components/ComparisonTable";
import { ThemeToggle } from "@/components/ThemeToggle";
import { isSameLayer, type ActiveLayer } from "@/lib/active-layers";

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
 */
export function PowerUserPanel() {
  const [selected, setSelected] = useState<ActiveLayer[]>(DEFAULT_SELECTION);

  function toggle(layer: ActiveLayer) {
    setSelected((prev) =>
      prev.some((s) => isSameLayer(s, layer)) ? prev.filter((s) => !isSameLayer(s, layer)) : [...prev, layer],
    );
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
          <Link href="/" className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Simple view
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 p-6 md:flex-row">
        <div className="md:w-72 md:flex-shrink-0">
          <LayerPicker selected={selected} onToggle={toggle} />
        </div>
        <ComparisonTable selected={selected} />
      </div>
    </main>
  );
}
