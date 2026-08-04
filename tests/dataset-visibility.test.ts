import { beforeEach, describe, expect, it } from "vitest";
import { getHiddenDatasetIds, setHiddenDatasetIds } from "@/lib/dataset-visibility";

describe("dataset-visibility", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing has been hidden yet", () => {
    expect(getHiddenDatasetIds()).toEqual([]);
  });

  it("round-trips a set of hidden dataset ids", () => {
    setHiddenDatasetIds(["crime", "political-lean"]);
    expect(getHiddenDatasetIds()).toEqual(["crime", "political-lean"]);
  });

  it("overwrites the previous set rather than merging", () => {
    setHiddenDatasetIds(["crime"]);
    setHiddenDatasetIds(["walkability"]);
    expect(getHiddenDatasetIds()).toEqual(["walkability"]);
  });

  it("fails open to an empty array on corrupted localStorage data, never throws", () => {
    window.localStorage.setItem("mapstack:hidden-datasets", "{not valid json");
    expect(getHiddenDatasetIds()).toEqual([]);
  });

  it("fails open to an empty array when the stored value isn't an array", () => {
    window.localStorage.setItem("mapstack:hidden-datasets", JSON.stringify({ foo: "bar" }));
    expect(getHiddenDatasetIds()).toEqual([]);
  });

  it("filters out non-string entries rather than throwing", () => {
    window.localStorage.setItem("mapstack:hidden-datasets", JSON.stringify(["crime", 42, null, "walkability"]));
    expect(getHiddenDatasetIds()).toEqual(["crime", "walkability"]);
  });
});
