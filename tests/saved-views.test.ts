import { beforeEach, describe, expect, it } from "vitest";
import { deleteView, getSavedViews, renameView, saveView } from "@/lib/saved-views";

describe("saved-views", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("returns an empty array when nothing has been saved yet", () => {
    expect(getSavedViews()).toEqual([]);
  });

  it("saves a view and round-trips it through getSavedViews", () => {
    const view = saveView(
      "Grass + Violent Crime",
      [{ datasetId: "allergy", layerId: "grass" }],
      { datasetId: "allergy", layerId: "grass" },
      "asc",
    );
    const all = getSavedViews();
    expect(all).toHaveLength(1);
    expect(all[0]).toEqual(view);
    expect(all[0].name).toBe("Grass + Violent Crime");
  });

  it("deletes a saved view by id", () => {
    const a = saveView("A", [], null, "asc");
    const b = saveView("B", [], null, "asc");
    deleteView(a.id);
    const all = getSavedViews();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(b.id);
  });

  it("renames a saved view by id, leaving others untouched", () => {
    const a = saveView("Old name", [], null, "asc");
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
});
