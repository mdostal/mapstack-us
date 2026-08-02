"use client";

import { useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

/**
 * Collapsible dock for InsightsPanel, docked flush under the comparison
 * table -- a result you read, not an input you set, so it's visually
 * distinct from the accordion sidebar (AccordionSection) rather than
 * reusing it. Defaults open. See
 * .pHive/design/power-user-advanced-layout/brief.md.
 */
export function InsightsDock({ children }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        <span>Insights</span>
        <span className="normal-case tracking-normal">{open ? "▾ collapse" : "▸ expand"}</span>
      </button>
      {open && <div className="border-t border-zinc-200 p-3 dark:border-zinc-800">{children}</div>}
    </div>
  );
}
