"use client";

import Link from "next/link";
import { DATASETS } from "@/lib/datasets/registry";
import { DATASET_SOURCES, methodologyDocUrl } from "@/lib/dataset-sources";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * In-app source transparency, mirroring docs/index.html's own "every
 * dataset, every real source" section but reachable from the live app
 * itself, not just GitHub or the GitHub Pages site -- explicit operator
 * direction: info that only lives in the repo/docs isn't transparent to
 * someone who never leaves the app. See medical-study-tracker's own
 * Networks page for the pattern this is modeled on.
 */
export function SourcesPage() {
  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-start justify-between gap-3 px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Sources
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Every one of the {DATASETS.length} datasets on this map, and exactly where its numbers
            come from.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Map
          </Link>
          <Link href="/about" prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            About
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
          No dataset here is invented, scraped from a paywall, or purchased from a data broker.
          Every row below links to the real, live, public source it was fetched from — and this
          repo&apos;s own <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">data/*-methodology.md</code>{" "}
          files (linked per row) go further: real coverage numbers, known gaps, and exactly what
          each layer&apos;s 0–100 score does and doesn&apos;t mean.
        </p>

        <div className="flex flex-col gap-2">
          {DATASETS.map((dataset) => {
            const source = DATASET_SOURCES[dataset.id];
            return (
              <div
                key={dataset.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="font-medium text-zinc-900 dark:text-zinc-50">{dataset.label}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400">
                  {source ? (
                    <>
                      <a href={source.url} target="_blank" rel="noreferrer" className="underline">
                        {source.name}
                      </a>
                      {source.note ? <> ({source.note})</> : null}
                      {" — "}
                      <a href={methodologyDocUrl(dataset.id)} target="_blank" rel="noreferrer" className="underline">
                        methodology
                      </a>
                    </>
                  ) : (
                    "source not yet documented"
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
