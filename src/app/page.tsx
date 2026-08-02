import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <div className="mx-auto flex w-full max-w-6xl items-start justify-between px-6 pt-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Mapstack
          </h1>
          <p className="mt-1 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
            Open-source US map layers. Pick datasets, overlay them, find what matters to you.
          </p>
        </div>
        <ThemeToggle />
      </div>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-12">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Early scaffold — the generalized dataset-layer engine this repo builds toward is
          documented in{" "}
          <a
            href="https://github.com/mdostal/allergy-locator/blob/main/.pHive/planning/roadmap.md"
            className="text-blue-600 hover:underline dark:text-blue-400"
            target="_blank"
            rel="noreferrer"
          >
            allergy-locator&rsquo;s v5 roadmap
          </a>
          , the project this one generalizes.
        </p>
      </div>
    </main>
  );
}
