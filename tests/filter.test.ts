import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
vi.mock("@/lib/db/client", () => ({ query: (...args: unknown[]) => queryMock(...args) }));

const { filterCityIds } = await import("@/lib/db/filter");

describe("filter", () => {
  beforeEach(() => {
    queryMock.mockClear();
  });

  it("returns null (no filter applied) when no criterion has a threshold", async () => {
    const result = await filterCityIds(
      [{ layer: { datasetId: "allergy", layerId: "grass" }, min: null, max: null }],
      null,
    );
    expect(result).toBeNull();
    expect(queryMock).not.toHaveBeenCalled();
  });

  it("builds a single-criterion query with a min threshold", async () => {
    queryMock.mockResolvedValueOnce([{ id: "a" }, { id: "b" }]);
    const result = await filterCityIds(
      [{ layer: { datasetId: "allergy", layerId: "grass" }, min: 60, max: null }],
      null,
    );
    expect(result).toEqual(new Set(["a", "b"]));

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("JOIN layer_values lv0");
    expect(sql).toContain("lv0.value >= ?");
    expect(sql).not.toContain("lv0.value <= ?");
    expect(params).toEqual(["allergy", "grass", null, 60]);
  });

  it("builds a min+max query for one criterion", async () => {
    queryMock.mockResolvedValueOnce([]);
    await filterCityIds([{ layer: { datasetId: "crime", layerId: "violent_crime" }, min: 10, max: 50 }], 2024);

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("lv0.value >= ?");
    expect(sql).toContain("lv0.value <= ?");
    expect(params).toEqual(["crime", "violent_crime", 2024, 10, 50]);
  });

  it("joins multiple criteria with AND, one join per criterion, ignoring criteria with no threshold", async () => {
    queryMock.mockResolvedValueOnce([]);
    await filterCityIds(
      [
        { layer: { datasetId: "allergy", layerId: "grass" }, min: 60, max: null },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, min: null, max: 40 },
        { layer: { datasetId: "allergy", layerId: "ragweed" }, min: null, max: null },
      ],
      null,
    );

    const [sql, params] = queryMock.mock.calls[0];
    expect(sql).toContain("JOIN layer_values lv0");
    expect(sql).toContain("JOIN layer_values lv1");
    expect(sql).not.toContain("lv2");
    expect(sql).toContain("lv0.value >= ? AND lv1.value <= ?");
    // allergy (non-time-varying) always binds NULL; crime (time-varying)
    // resolves the shared null year to its own latest real year (2025) --
    // NOT the same null passed in, since crime rows are never stored with
    // year IS NULL. See src/lib/db/effective-year.ts.
    expect(params).toEqual(["allergy", "grass", null, "crime", "violent_crime", 2025, 60, 40]);
  });

  it("resolves each criterion's year independently of the app's single shared year value -- a non-time-varying dataset always binds NULL even when a time-varying layer's year is explicitly set", async () => {
    queryMock.mockResolvedValueOnce([]);
    await filterCityIds(
      [
        { layer: { datasetId: "allergy", layerId: "grass" }, min: 60, max: null },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, min: null, max: 40 },
      ],
      2022,
    );

    const [, params] = queryMock.mock.calls[0];
    expect(params).toEqual(["allergy", "grass", null, "crime", "violent_crime", 2022, 60, 40]);
  });

  it("returns an empty set (not null) when criteria are set but nothing matches", async () => {
    queryMock.mockResolvedValueOnce([]);
    const result = await filterCityIds(
      [{ layer: { datasetId: "allergy", layerId: "grass" }, min: 999, max: null }],
      null,
    );
    expect(result).toEqual(new Set());
  });
});
