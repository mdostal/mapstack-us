"use client";

import { useEffect, useState } from "react";
import { query } from "@/lib/db/client";

interface CityMatch {
  id: string;
  city: string;
  state: string;
}

interface Props {
  onSelectCity: (cityId: string) => void;
}

/**
 * Real SQL-backed city search over data.sqlite (scripts/build-sqlite.ts) --
 * the first feature built on the client-side SQLite store, demonstrating
 * search/filter that the plain-JS-array approach didn't offer. See
 * .pHive/epics/data-store/docs/design-note.md.
 */
export function CitySearch({ onSelectCity }: Props) {
  const [term, setTerm] = useState("");
  const [matches, setMatches] = useState<CityMatch[]>([]);
  const [error, setError] = useState(false);
  const isSearching = term.trim().length >= 2;

  // Only setState from within the resolved/rejected callbacks, never
  // synchronously in the effect body -- lint (react-hooks/set-state-in-effect)
  // flags synchronous setState in an effect as a cascading-render risk.
  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;

    let cancelled = false;
    const like = `%${trimmed}%`;

    query<CityMatch>("SELECT id, city, state FROM cities WHERE city LIKE ? OR state LIKE ? ORDER BY city LIMIT 20", [
      like,
      like,
    ])
      .then((rows) => {
        if (cancelled) return;
        setMatches(rows);
        setError(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("City search query failed", err);
        setError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [term]);

  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <label htmlFor="city-search" className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        Search cities
      </label>
      <input
        id="city-search"
        type="text"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="City or state..."
        className="w-full rounded border border-zinc-200 bg-transparent px-2 py-1 text-xs dark:border-zinc-700"
      />
      {isSearching && error && (
        <p className="text-xs text-red-600 dark:text-red-400">Search is unavailable right now.</p>
      )}
      {isSearching && !error && (
        <ul className="mt-1 flex max-h-40 flex-col gap-0.5 overflow-y-auto">
          {matches.length === 0 ? (
            <li className="text-xs text-zinc-500 dark:text-zinc-400">No matches.</li>
          ) : (
            matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => onSelectCity(m.id)}
                  className="w-full rounded px-1.5 py-1 text-left text-xs text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {m.city}, {m.state}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
