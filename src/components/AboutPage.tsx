"use client";

import Link from "next/link";
import { DATASETS } from "@/lib/datasets/registry";
import { ThemeToggle } from "@/components/ThemeToggle";

/**
 * In-app "who made this, why, how to add to it, how to support it" page --
 * explicit operator direction, after seeing medical-study-tracker's own
 * About/Networks/Resources/Disclaimer tabs: this kind of transparency
 * belongs in the live app itself, not only in the repo/docs site. See
 * SourcesPage.tsx for the companion per-dataset source list.
 */
export function AboutPage() {
  return (
    <main id="main-content" className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-3xl flex-wrap items-start justify-between gap-3 px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            About
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            What Mapstack is, who made it, and how to add to it.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Map
          </Link>
          <Link href="/sources" prefetch={false} className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400">
            Sources
          </Link>
          <ThemeToggle />
        </div>
      </div>

      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-6 py-8 text-sm text-zinc-700 dark:text-zinc-300">
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            What this is
          </h2>
          <p>
            One US map engine, any dataset as a layer. Add a dataset, stack as many as you want,
            click a city — the same rendering pipeline drives every one of Mapstack&apos;s{" "}
            {DATASETS.length} datasets, because every dataset implements one small, shared
            interface rather than getting its own hand-built map code.
          </p>
          <p>
            It generalizes{" "}
            <a
              href="https://mdostal.github.io/allergy-locator/"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              Allergy Locator
            </a>
            , which shipped first as a real, validated US allergy-severity map. Once a second real
            dataset (healthcare access) got built the same way inside that project, the shared
            shape between the two became clear enough to actually generalize — rather than
            guessing at an abstraction from a single case.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Where the data comes from
          </h2>
          <p>
            Every dataset is real, free, and keyless — sourced from a public government agency
            (FBI, EPA, FEMA, CDC, USDA, Census, NOAA, BLS...) or a free public API, never scraped
            from behind a paywall or purchased from a data broker. When a source doesn&apos;t
            cover a city, or doesn&apos;t publish a field, that shows as a real, honest gap — never
            a fabricated value. See{" "}
            <Link href="/sources" prefetch={false} className="underline">
              Sources
            </Link>{" "}
            for the full per-dataset list, or this repo&apos;s own{" "}
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              data/*-methodology.md
            </code>{" "}
            files for the real coverage numbers and known gaps behind each one.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Add to it, or just take it
          </h2>
          <p>
            This is open source (MIT licensed) — the whole point is that you don&apos;t need
            permission to use it. Adding a new dataset means implementing one small interface
            (
            <code className="rounded bg-zinc-200 px-1 py-0.5 text-xs dark:bg-zinc-800">
              getValue()
            </code>{" "}
            returning a 0–100 concern score plus a one-line detail, per{" "}
            <a
              href="https://github.com/mdostal/mapstack-us/blob/main/src/lib/datasets/types.ts"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              src/lib/datasets/types.ts
            </a>
            ), registering it once, and the exact same map, legend, detail panel, and year control
            all render it — zero new rendering code. Open a pull request, or fork the repo and run
            it entirely on your own:
          </p>
          <ul className="ml-4 list-disc">
            <li>
              <a
                href="https://github.com/mdostal/mapstack-us"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Source on GitHub
              </a>{" "}
              — clone it, add a dataset, open an issue, or send a pull request.
            </li>
            <li>
              <a
                href="https://github.com/mdostal/mapstack-us/blob/main/CONTRIBUTING.md"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                CONTRIBUTING.md
              </a>{" "}
              — the step-by-step walkthrough for adding a new dataset.
            </li>
            <li>
              <a
                href="https://github.com/mdostal/mapstack-us/blob/main/README.md"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                README
              </a>{" "}
              — full setup, the dataset backlog, and every principle this project runs on.
            </li>
            <li>
              Zero required backend and $0 to run — it&apos;s a static Next.js build, so a fork
              deploys anywhere for free.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            Support this project
          </h2>
          <p>Free and open source, always. A few ways to help — or just say hi:</p>
          <ul className="ml-4 list-disc">
            <li>
              <strong className="text-zinc-900 dark:text-zinc-50">Use it, star it, file an issue.</strong>{" "}
              Honestly the best support an open-source project can get. →{" "}
              <a
                href="https://tools.mdostal.com/mapstack"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                this project
              </a>
            </li>
            <li>
              <strong className="text-zinc-900 dark:text-zinc-50">Hire me.</strong> I do
              fractional-CTO and consulting work — fixing and scaling tech stacks. →{" "}
              <a href="https://mdostal.com/contact" target="_blank" rel="noreferrer" className="underline">
                mdostal.com/contact
              </a>
            </li>
            <li>
              <a
                href="https://www.buymeacoffee.com/mdostal"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Buy me a coffee
              </a>{" "}
              if it saved you time.
            </li>
            <li>
              More tools like this →{" "}
              <a href="https://tools.mdostal.com" target="_blank" rel="noreferrer" className="underline">
                tools.mdostal.com
              </a>
            </li>
            <li>
              Life outside the terminal →{" "}
              <a href="https://life.mdostal.com" target="_blank" rel="noreferrer" className="underline">
                life.mdostal.com
              </a>
            </li>
            <li>
              What we&apos;re building at Firefly Events — event discovery, 8,000+ events/day
              from 7+ sources →{" "}
              <a href="https://ff.events" target="_blank" rel="noreferrer" className="underline">
                ff.events
              </a>
            </li>
          </ul>
          <p>Always up for a conversation if any of it&apos;s useful to you.</p>
        </section>

        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          MIT licensed. Directional, not authoritative — every layer documents its own sourcing
          and limitations; nothing here replaces official records, professional advice, or your
          own research.
        </p>
      </div>
    </main>
  );
}
