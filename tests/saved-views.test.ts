import { beforeEach, describe, expect, it } from "vitest";
import { deleteView, getSavedViews, renameView, saveView } from "@/lib/saved-views";

describe("saved-views", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing has been saved yet", () => {
    expect(getSavedViews()).toEqual([]);
  });

  it("saves a view (with a single sort key) and round-trips it through getSavedViews", () => {
    const view = saveView("Grass + Violent Crime", [{ datasetId: "allergy", layerId: "grass" }], [
      { layer: { datasetId: "allergy", layerId: "grass" }, direction: "asc" },
    ]);
    const all = getSavedViews();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(view);
    expect(all[0].name).toBe("Grass + Violent Crime");
  });

  it("saves a view with multiple (tie-break) sort keys, in order", () => {
    const sortKeys = [
      { layer: { datasetId: "allergy", layerId: "grass" }, direction: "asc" as const },
      { layer: { datasetId: "crime", layerId: "violent_crime" }, direction: "desc" as const },
    ];
    saveView("Multi-key", [], sortKeys);
    expect(getSavedViews()[0].sortKeys).toEqual(sortKeys);
  });

  it("deletes a saved view by id", () => {
    const a = saveView("A", [], []);
    const b = saveView("B", [], []);
    deleteView(a.id);
    const all = getSavedViews();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });

  it("renames a saved view by id, leaving others untouched", () => {
    const a = saveView("Old name", [], []);
    renameView(a.id, "New name");
    expect(getSavedViews()[0].name).toBe("New name");
  });

  it("fails open to an empty array on corrupted/foreign localStorage JSON, never throws", () => {
    window.localStorage.setItem("mapstack:saved-views", "{not valid json");
    expect(() => getSavedViews()).not.toThrow();
    expect(getSavedViews()).toEqual([]);
  });

  it("fails open to an empty array when the stored value is valid JSON but not an array", () => {
    window.localStorage.setItem("mapstack:saved-views", JSON.stringify({ not: "an array" }));
    expect(getSavedViews()).toEqual([]);
  });

  it("returns an empty array during SSR (no window.localStorage) without throwing", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error -- simulating an SSR environment where window is undefined
    delete globalThis.window;
    try {
      expect(getSavedViews()).toEqual([]);
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("reads an older single sortBy/direction view (from before multi-key sort) into a single-entry sortKeys array", () => {
    window.localStorage.setItem(
      "mapstack:saved-views",
      JSON.stringify([
        {
          id: "legacy-1",
          name: "Legacy view",
          selections: [{ datasetId: "allergy", layerId: "grass" }],
          sortBy: { datasetId: "allergy", layerId: "grass" },
          direction: "desc",
          savedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    expect(getSavedViews()).toEqual([
      {
        id: "legacy-1",
        name: "Legacy view",
        selections: [{ datasetId: "allergy", layerId: "grass" }],
        sortBy: { datasetId: "allergy", layerId: "grass" },
        direction: "desc",
        savedAt: "2026-01-01T00:00:00.000Z",
        sortKeys: [{ layer: { datasetId: "allergy", layerId: "grass" }, direction: "desc" }],
      },
    ]);
  });

  it("reads an older view with no sortBy into an empty sortKeys array", () => {
    window.localStorage.setItem(
      "mapstack:saved-views",
      JSON.stringify([
        {
          id: "legacy-2",
          name: "No sort",
          selections: [],
          sortBy: null,
          direction: "asc",
          savedAt: "2026-01-01T00:00:00.000Z",
        },
      ]),
    );
    expect(getSavedViews()[0].sortKeys).toEqual([]);
  });

  it("drops an entry that doesn't even minimally look like a saved view, rather than crashing on it", () => {
    window.localStorage.setItem("mapstack:saved-views", JSON.stringify([{ garbage: true }, null, "a string"]));
    expect(getSavedViews()).toEqual([]);
  });
});
