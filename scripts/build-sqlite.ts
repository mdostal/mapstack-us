/**
 * CLI entry: compiles the app's data into public/data.sqlite (a static
 * asset, queried entirely client-side via sql.js/WASM -- see
 * src/lib/db/build-database.ts for the schema/population logic (unit
 * tested at tests/build-database.test.ts) and
 * .pHive/epics/data-store/docs/design-note.md for the full rationale.
 *
 * Runs via tsx (no native compilation -- better-sqlite3 was rejected after
 * a node-gyp/distutils build failure on this machine; see design-note.md).
 * sql.js builds AND later queries the database, so build-time and browser
 * runtime share one engine.
 */
import initSqlJs from "sql.js";
import { writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname } from "node:path";
import { buildDatabase } from "../src/lib/db/build-database";

const OUTPUT_PATH = new URL("../public/data.sqlite", import.meta.url).pathname;

// The browser build of sql.js (dist/sql-wasm-browser.js, resolved via the
// package's "browser" export condition) requests this exact wasm filename
// via its default locateFile -- copy it into public/ once per build so the
// client can fetch it as a plain static asset, no bundler wasm handling.
const WASM_SOURCE = new URL("../node_modules/sql.js/dist/sql-wasm-browser.wasm", import.meta.url).pathname;
const WASM_DEST = new URL("../public/sql-wasm-browser.wasm", import.meta.url).pathname;

async function main() {
  const SQL = await initSqlJs();
  const { db, valueCount } = buildDatabase(SQL);

  const bytes = db.export();
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, Buffer.from(bytes));
  db.close();

  copyFileSync(WASM_SOURCE, WASM_DEST);

  console.log(`Built ${OUTPUT_PATH}: ${valueCount} layer values (${(bytes.length / 1024).toFixed(0)} KB).`);
  console.log(`Copied sql.js WASM binary to ${WASM_DEST}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
