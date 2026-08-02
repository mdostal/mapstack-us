"use client";

import { useState, type ReactNode } from "react";

interface Props {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * Collapsible sidebar section -- matches AddLayerPanel's existing
 * expand/collapse convention (button + −/+ indicator). Used to keep the
 * /mapstack/advanced sidebar to a bounded set of sections (Layers, Saved
 * views) rather than every panel always fully expanded. See
 * .pHive/design/power-user-advanced-layout/brief.md.
 */
export function AccordionSection({ title, defaultOpen = false, children }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400"
      >
        <span>{title}</span>
        <span aria-hidden>{open ? "−" : "+"}</span>
      </button>
      {open && <div className="flex flex-col gap-2 border-t border-zinc-200 p-3 dark:border-zinc-800">{children}</div>}
    </div>
  );
}
