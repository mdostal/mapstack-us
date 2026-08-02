"use client";

import cities from "@data/cities.json";
import { resolveActiveLayer, activeLayerKey, type ActiveLayer } from "@/lib/active-layers";

interface Props {
  selected: ActiveLayer[];
}

/**
 * Per-city comparison table: one column per selected (dataset, layer) pair,
 * each header carrying that dataset's methodology note IN THE HEADER (never
 * a footnote) so nothing reads as a single unexplained composite number --
 * see design-discussion.md §3.2/§3.3 (no cross-dataset combined score in
 * this epic; grill-record findings U1/P1). Sort is added in story pu-2.
 */
export function ComparisonTable({ selected }: Props) {
  if (selected.length < 2) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-zinc-300 p-8 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        Select 2+ layers on the left to compare cities.
      </div>
    );
  }

  const columns = selected.map((item) => ({ item, resolved: resolveActiveLayer(item) })).filter((c) => c.resolved);

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-900">
          <tr>
            <th scope="col" className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50">
              City
            </th>
            {columns.map(({ item, resolved }) => (
              <th
                key={activeLayerKey(item)}
                scope="col"
                className="border-b border-zinc-200 px-3 py-2 font-semibold text-zinc-900 dark:border-zinc-800 dark:text-zinc-50"
              >
                <div>
                  {resolved!.dataset.label}: {resolved!.layer.label}
                </div>
                <div className="mt-0.5 font-normal text-zinc-500 dark:text-zinc-400">
                  {resolved!.dataset.description}{" "}
                  <a
                    href={resolved!.dataset.methodologyUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    See methodology
                  </a>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cities.map((city) => (
            <tr key={city.id} className="odd:bg-white even:bg-zinc-50 dark:odd:bg-black dark:even:bg-zinc-950">
              <th scope="row" className="whitespace-nowrap px-3 py-1.5 font-medium text-zinc-800 dark:text-zinc-100">
                {city.city}, {city.state}
              </th>
              {columns.map(({ item, resolved }) => {
                const result = resolved!.dataset.getValue(city.id, resolved!.layer.id);
                return (
                  <td
                    key={activeLayerKey(item)}
                    className="px-3 py-1.5 text-zinc-700 dark:text-zinc-300"
                  >
                    {result ? result.detail : <span className="text-zinc-400 dark:text-zinc-600">No data</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
