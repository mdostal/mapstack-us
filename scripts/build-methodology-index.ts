/**
 * Builds data/methodology-index.json -- a static map of datasetId to the
 * full raw text of that dataset's real methodology doc, so the browser
 * chat tools (src/lib/chat/functions.ts's getMethodology) can read
 * methodology prose the SAME way they read every other dataset value:
 * a static bundled import, no `fs`, no network fetch. `fs` can't be used
 * from functions.ts because it's shared with the browser bundle (the
 * in-app BYOK chat imports it directly); a network fetch would violate
 * that file's own stated "no network calls" design and would make the
 * chat tools flaky/untestable offline. Reading each real methodology.md
 * file straight off disk is a build-time-only step -- this script itself
 * runs under tsx/Node, never in the browser.
 *
 * Resolves each dataset's real markdown file from its OWN
 * `methodologyUrl` field (not a filename guess) -- most datasets follow
 * an `{id}-methodology.md` convention, but not all (e.g. allergy.ts's is
 * `allergy-scoring.md`), so this always reads the dataset's own
 * authoritative field rather than assuming a pattern.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { DATASETS } from "../src/lib/datasets/registry";

const ROOT = new URL("..", import.meta.url).pathname;
const OUTPUT_PATH = `${ROOT}data/methodology-index.json`;
const REPO_URL_PREFIX = "https://github.com/mdostal/mapstack-us/blob/main/";

function main() {
  const index: Record<string, string> = {};
  const missing: string[] = [];

  for (const dataset of DATASETS) {
    if (!dataset.methodologyUrl.startsWith(REPO_URL_PREFIX)) {
      missing.push(`${dataset.id} (methodologyUrl doesn't match the expected repo prefix: ${dataset.methodologyUrl})`);
      continue;
    }
    const relativePath = dataset.methodologyUrl.slice(REPO_URL_PREFIX.length);
    try {
      index[dataset.id] = readFileSync(`${ROOT}${relativePath}`, "utf-8");
    } catch {
      missing.push(`${dataset.id} (file not found: ${relativePath})`);
    }
  }

  writeFileSync(OUTPUT_PATH, JSON.stringify(index, null, 2) + "\n");
  console.error(`Wrote data/methodology-index.json: ${Object.keys(index).length}/${DATASETS.length} datasets.`);
  if (missing.length) {
    console.error(`Missing (${missing.length}): ${missing.join(", ")}`);
    process.exit(1);
  }
}

main();
