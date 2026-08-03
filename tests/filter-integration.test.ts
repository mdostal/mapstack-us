import { beforeAll, describe, expect, it, vi } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { buildDatabase } from "@/lib/db/build-database";

// Regression for a real bug: filterCityIds bound the app's single shared
// `year` value uniformly into every criterion's join, even though allergy/
// care-access rows are always stored with year IS NULL and crime rows never
// are. Mixing a time-varying and non-time-varying criterion always returned
// zero cities, silently -- see src/lib/db/effective-year.ts. Runs against a
// real in-memory database (like insights.test.ts) so it proves actual query
// results, not just the params array shape (see filter.test.ts for that).
let db: Database;

vi.mock("@/lib/db/client", () => ({
  query: async <T>(sql: string, params: (string | number | null)[] = []): Promise<T[]> => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: T[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject() as T);
    stmt.free();
    return rows;
  },
}));

const { filterCityIds } = await import("@/lib/db/filter");

describe("filterCityIds (integration)", () => {
  beforeAll(async () => {
    const SQL = await initSqlJs();
    ({ db } = buildDatabase(SQL));
  });

  it("matches real cities when combining a non-time-varying (allergy) and time-varying (crime) criterion, with the shared year left null", async () => {
    const result = await filterCityIds(
      [
        { layer: { datasetId: "allergy", layerId: "grass" }, min: 0, max: null },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, min: 0, max: null },
      ],
      null,
    );
    expect(result).not.toBeNull();
    expect(result!.size).toBeGreaterThan(0);
  });

  it("still matches real cities when the shared year is explicitly set to a real crime year", async () => {
    const result = await filterCityIds(
      [
        { layer: { datasetId: "allergy", layerId: "grass" }, min: 0, max: null },
        { layer: { datasetId: "care-access", layerId: "general" }, min: 0, max: null },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, min: 0, max: null },
      ],
      2024,
    );
    expect(result).not.toBeNull();
    expect(result!.size).toBeGreaterThan(0);
  });
});
