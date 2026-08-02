"use client";

import type { Database, SqlJsStatic } from "sql.js";

/**
 * Client-side query layer over data.sqlite (built by scripts/build-sqlite.ts,
 * shipped as a static asset in public/) via sql.js/WASM entirely in the
 * browser -- no server, no special headers (read-only database, no OPFS/
 * SharedArrayBuffer needed). See .pHive/epics/data-store/docs/design-note.md.
 *
 * Lazily loaded and cached at module scope -- call query() from a client
 * component; the first call pays the fetch+WASM-init cost, subsequent calls
 * reuse the same in-memory database.
 */

function basePath(): string {
  return process.env.NEXT_PUBLIC_BASE_PATH ?? "";
}

let sqlPromise: Promise<SqlJsStatic> | null = null;
let dbPromise: Promise<Database> | null = null;

async function loadSql(): Promise<SqlJsStatic> {
  const initSqlJs = (await import("sql.js")).default;
  return initSqlJs({ locateFile: (file) => `${basePath()}/${file}` });
}

async function loadDb(): Promise<Database> {
  if (!sqlPromise) sqlPromise = loadSql();
  const [SQL, response] = await Promise.all([sqlPromise, fetch(`${basePath()}/data.sqlite`)]);
  if (!response.ok) {
    throw new Error(`Failed to fetch data.sqlite: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  return new SQL.Database(new Uint8Array(buffer));
}

export function getDb(): Promise<Database> {
  if (!dbPromise) dbPromise = loadDb();
  return dbPromise;
}

export type SqlParam = string | number | null;

export async function query<T = Record<string, unknown>>(sql: string, params: SqlParam[] = []): Promise<T[]> {
  const db = await getDb();
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return rows;
}
