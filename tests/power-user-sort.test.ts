import { describe, expect, it } from "vitest";
import { sortByValue } from "@/lib/power-user/sort";

interface City {
  id: string;
  value: number | null;
}

describe("power-user/sort", () => {
  const cities: City[] = [
    { id: "b", value: 50 },
    { id: "a", value: 10 },
    { id: "c", value: null },
    { id: "d", value: 90 },
  ];

  it("sorts ascending by the given value", () => {
    const sorted = sortByValue(cities, (c) => c.value, "asc");
    expect(sorted.map((c) => c.id)).toEqual(["a", "b", "d", "c"]);
  });

  it("sorts descending by the given value", () => {
    const sorted = sortByValue(cities, (c) => c.value, "desc");
    expect(sorted.map((c) => c.id)).toEqual(["d", "b", "a", "c"]);
  });

  it("always sorts null-value items to the end, regardless of direction", () => {
    const asc = sortByValue(cities, (c) => c.value, "asc");
    const desc = sortByValue(cities, (c) => c.value, "desc");
    expect(asc[asc.length - 1].id).toBe("c");
    expect(desc[desc.length - 1].id).toBe("c");
  });

  it("is stable and non-mutating: does not reorder or modify the input array", () => {
    const original = [...cities];
    sortByValue(cities, (c) => c.value, "asc");
    expect(cities).toEqual(original);
  });

  it("handles an all-null input without throwing, preserving original order", () => {
    const allNull: City[] = [
      { id: "x", value: null },
      { id: "y", value: null },
    ];
    expect(sortByValue(allNull, (c) => c.value, "asc").map((c) => c.id)).toEqual(["x", "y"]);
  });

  it("handles an empty array", () => {
    expect(sortByValue([], (c: City) => c.value, "asc")).toEqual([]);
  });
});
