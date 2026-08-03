import { describe, expect, it } from "vitest";
import { buildComparisonCsv } from "@/lib/power-user/build-comparison-csv";
import cities from "@data/cities.json";

const ALL_ROWS = cities.length + 1; // header + every spine city

describe("build-comparison-csv", () => {
  it("builds a CSV with one column per selected layer for all cities when unfiltered", () => {
    const csv = buildComparisonCsv(
      [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      null,
      [],
      null,
    );
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe("City,Allergy severity: Grass,Crime: Violent crime");
    expect(lines).toHaveLength(ALL_ROWS);
  });

  it("restricts rows to the given visibleCityIds set", () => {
    const csv = buildComparisonCsv(
      [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      null,
      [],
      new Set(["new-york-ny", "austin-tx"]),
    );
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3); // header + 2 cities
  });

  it("sorts rows by the given single sort key and direction", () => {
    const asc = buildComparisonCsv(
      [{ datasetId: "allergy", layerId: "grass" }],
      null,
      [{ layer: { datasetId: "allergy", layerId: "grass" }, direction: "asc" }],
      null,
    );
    const desc = buildComparisonCsv(
      [{ datasetId: "allergy", layerId: "grass" }],
      null,
      [{ layer: { datasetId: "allergy", layerId: "grass" }, direction: "desc" }],
      null,
    );
    const ascFirstRow = asc.trim().split("\n")[1];
    const descFirstRow = desc.trim().split("\n")[1];
    expect(ascFirstRow).not.toBe(descFirstRow);
  });

  it("breaks ties with a second sort key rather than combining the columns", () => {
    const csv = buildComparisonCsv(
      [
        { datasetId: "allergy", layerId: "grass" },
        { datasetId: "crime", layerId: "violent_crime" },
      ],
      2024,
      [
        { layer: { datasetId: "allergy", layerId: "grass" }, direction: "asc" },
        { layer: { datasetId: "crime", layerId: "violent_crime" }, direction: "desc" },
      ],
      null,
    );
    expect(csv.trim().split("\n")).toHaveLength(ALL_ROWS);
  });

  it("produces just the header row for an empty selection", () => {
    const csv = buildComparisonCsv([], null, [], null);
    expect(csv.trim().split("\n")).toHaveLength(ALL_ROWS); // header + all cities, zero columns
    expect(csv.trim().split("\n")[0]).toBe("City");
  });
});
