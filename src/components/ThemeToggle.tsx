"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

const OPTIONS = ["light", "dark", "system"] as const;

/** A tri-state light/dark/system toggle, next-themes-backed. Ported verbatim
 * from allergy-locator -- fully dataset-agnostic. */
export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="h-7 w-24" aria-hidden />;
  }

  const current = theme ?? "system";

  function cycle() {
    const next = OPTIONS[(OPTIONS.indexOf(current as (typeof OPTIONS)[number]) + 1) % OPTIONS.length];
    setTheme(next);
  }

  const icon = resolvedTheme === "dark" ? "🌙" : "☀️";

  return (
    <button
      type="button"
      onClick={cycle}
      className="flex items-center gap-1.5 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
      aria-label={`Theme: ${current}. Click to change.`}
    >
      <span aria-hidden>{icon}</span>
      <span className="capitalize">{current}</span>
    </button>
  );
}
