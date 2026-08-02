import { beforeAll, describe, expect, it, vi } from "vitest";
import initSqlJs, { type Database } from "sql.js";
import { buildDatabase } from "@/lib/db/build-database";
import { DATASETS } from "@/lib/datasets/registry";

// Mocks src/lib/db/client.ts's query() to run against a real in-memory
// database (built the same way as the production build script) instead of
// fetching over HTTP, so getLayerInsights's actual query construction is
// what's under test -- not a reimplementation of it.
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

const { getLayerInsights } = await import("@/lib/db/insights");

describe("insights", () => {
  beforeAll(async () => {
    const SQL = await initSqlJs();
    ({ db } = buildDatabase(SQL));
  });

  it("returns min/max/avg/count consistent with each other for a real layer", async () => {
    const insights = await getLayerInsights({ datasetId: "allergy", layerId: "grass" }, null);
    expect(insights).not.toBeNull();
    expect(insights!.count).toBeGreaterThan(0);
    expect(insights!.min).toBeLessThanOrEqual(insights!.avg);
    expect(insights!.avg).toBeLessThanOrEqual(insights!.max);
  });

  it("returns the top-N cities ordered descending by value, capped at the requested limit", async () => {
    const insights = await getLayerInsights({ datasetId: "allergy", layerId: "grass" }, null, 3);
    expect(insights!.top).toHaveLength(3);
    expect(insights!.top[0].value).toBeGreaterThanOrEqual(insights!.top[1].value);
    expect(insights!.top[1].value).toBeGreaterThanOrEqual(insights!.top[2].value);
    expect(insights!.top[0].value).toBe(insights!.max);
  });

  it("returns the bottom-N cities ordered ascending by value", async () => {
    const insights = await getLayerInsights({ datasetId: "allergy", layerId: "grass" }, null, 3);
    expect(insights!.bottom).toHaveLength(3);
    expect(insights!.bottom[0].value).toBeLessThanOrEqual(insights!.bottom[1].value);
    expect(insights!.bottom[0].value).toBe(insights!.min);
  });

  it("scopes correctly by year for a time-varying layer (crime)", async () => {
    const crime = DATASETS.find((d) => d.id === "crime")!;
    const year = crime.availableYears![crime.availableYears!.length - 1];
    const insights = await getLayerInsights({ datasetId: "crime", layerId: "violent_crime" }, year);
    expect(insights).not.toBeNull();
    expect(insights!.count).toBeGreaterThan(0);
  });

  it("returns null for a (dataset, layer, year) combination with no data at all", async () => {
    const insights = await getLayerInsights({ datasetId: "crime", layerId: "violent_crime" }, 1900);
    expect(insights).toBeNull();
  });

  it("each returned city carries a real, resolvable city id/label", async () => {
    const insights = await getLayerInsights({ datasetId: "allergy", layerId: "grass" }, null, 1);
    expect(insights!.top[0].id).toBeTruthy();
    expect(insights!.top[0].city).toBeTruthy();
    expect(insights!.top[0].state).toBeTruthy();
  });
});
