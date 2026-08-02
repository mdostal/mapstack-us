import { beforeAll, describe, expect, it } from "vitest";
import initSqlJs, { type Database, type SqlJsStatic } from "sql.js";
import { buildDatabase } from "@/lib/db/build-database";
import { DATASETS } from "@/lib/datasets/registry";
import cities from "@data/cities.json";

let SQL: SqlJsStatic;
let db: Database;

function all<T = Record<string, unknown>>(sql: string, params: (string | number | null)[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: T[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject() as T);
  stmt.free();
  return rows;
}

describe("build-database", () => {
  beforeAll(async () => {
    SQL = await initSqlJs();
    ({ db } = buildDatabase(SQL));
  });

  it("loads every city into the cities table", () => {
    const rows = all<{ n: number }>("SELECT COUNT(*) as n FROM cities");
    expect(rows[0].n).toBe(cities.length);
  });

  it("loads every dataset from the registry", () => {
    const rows = all<{ n: number }>("SELECT COUNT(*) as n FROM datasets");
    expect(rows[0].n).toBe(DATASETS.length);
  });

  it("a real value in layer_values exactly matches the same call to Dataset.getValue()", () => {
    // Grass allergy is annual-only (year IS NULL); pick a city known to
    // have data (New York) rather than assuming every city does.
    const rows = all<{ value: number; detail: string }>(
      "SELECT value, detail FROM layer_values WHERE city_id = ? AND dataset_id = 'allergy' AND layer_id = 'grass' AND year IS NULL",
      ["new-york-ny"],
    );
    expect(rows).toHaveLength(1);

    const allergy = DATASETS.find((d) => d.id === "allergy")!;
    const direct = allergy.getValue("new-york-ny", "grass");
    expect(direct).not.toBeNull();
    expect(rows[0].value).toBe(direct!.value);
    expect(rows[0].detail).toBe(direct!.detail);
  });

  it("a real time-varying value (crime) is stored per-year, matching Dataset.getValue() for that year", () => {
    const crime = DATASETS.find((d) => d.id === "crime")!;
    // Not every city has coverage for every year (real agency-reporting
    // gaps) -- use the latest year, which getValue() also defaults to.
    const year = crime.availableYears![crime.availableYears!.length - 1];
    const direct = crime.getValue("new-york-ny", "violent_crime", { year });
    expect(direct).not.toBeNull();

    const rows = all<{ value: number }>(
      "SELECT value FROM layer_values WHERE city_id = ? AND dataset_id = 'crime' AND layer_id = 'violent_crime' AND year = ?",
      ["new-york-ny", year],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].value).toBe(direct!.value);
  });

  it("does not insert a row for a city/layer/year combination where getValue() returns null (honest gaps, no fabricated rows)", () => {
    // San Francisco is a documented NIBRS-non-participation gap for crime --
    // see tests/e2e/mapstack.spec.ts's equivalent UI-level assertion.
    const rows = all(
      "SELECT * FROM layer_values WHERE city_id = 'san-francisco-ca' AND dataset_id = 'crime' AND layer_id = 'violent_crime'",
    );
    expect(rows).toHaveLength(0);
  });

  it("city search query (LIKE, case/substring) finds a known city by partial name", () => {
    const rows = all<{ id: string }>("SELECT id FROM cities WHERE city LIKE ?", ["%New Y%"]);
    expect(rows.some((r) => r.id === "new-york-ny")).toBe(true);
  });

  it("records every dataset's available years in dataset_years", () => {
    const crime = DATASETS.find((d) => d.id === "crime")!;
    const rows = all<{ year: number }>("SELECT year FROM dataset_years WHERE dataset_id = 'crime' ORDER BY year");
    expect(rows.map((r) => r.year)).toEqual(crime.availableYears);
  });
});
