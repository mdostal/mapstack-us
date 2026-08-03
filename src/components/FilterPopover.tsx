"use client";

import { useEffect, useRef, useState } from "react";
import { FilterPanel } from "@/components/FilterPanel";
import type { ActiveLayer } from "@/lib/active-layers";

interface Props {
  selected: ActiveLayer[];
  year: number | null;
  isActive: boolean;
  onFilterChange: (cityIds: Set<string> | null) => void;
}

/**
 * Toolbar-triggered popover wrapping FilterPanel -- "things you set" live
 * in the top toolbar (search + filter), not the sidebar. See
 * .pHive/design/power-user-advanced-layout/brief.md.
 */
export function FilterPopover({ selected, year, isActive, onFilterChange }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  if (selected.length < 2) return null;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`rounded border px-2 py-1 text-xs font-medium ${
          isActive
            ? "border-transparent bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
            : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
        }`}
      >
        Filter {isActive ? "· active" : "▾"}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-10 mt-1 max-h-[70vh] w-64 overflow-y-auto rounded-lg bg-zinc-50 shadow-lg dark:bg-black">
          <FilterPanel selected={selected} year={year} onFilterChange={onFilterChange} />
        </div>
      )}
    </div>
  );
}
