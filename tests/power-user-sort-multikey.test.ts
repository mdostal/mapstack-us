import { describe, expect, it } from "vitest";
import { sortByKeys } from "@/lib/power-user/sort";

interface City {
  id: string;
  a: number | null;
  b: number | null;
}

describe("power-user/sort -- sortByKeys (multi-key, tie-break, no combined score)", () => {
  const cities: City[] = [
    { id: "tie-high", a: 50, b: 10 },
    { id: "tie-low", a: 50, b: 90 },
    { id: "solo-low", a: 10, b: 5 },
    { id: "solo-high", a: 90, b: 5 },
  ];

  it("sorts by the primary key alone when only one key is given", () => {
    const sorted = sortByKeys(cities, [{ getValue: (c) => c.a, direction: "asc" }]);
    expect(sorted.map((c) => c.id)).toEqual(["solo-low", "tie-high", "tie-low", "solo-high"]);
  });

  it("breaks ties on the primary key using the secondary key", () => {
    const sorted = sortByKeys(cities, [
      { getValue: (c) => c.a, direction: "asc" },
      { getValue: (c) => c.b, direction: "asc" },
    ]);
    // solo-low (a=10) first, solo-high (a=90) last -- unambiguous on key 1.
    // tie-high/tie-low share a=50, broken by b ascending: tie-high (b=10) before tie-low (b=90).
    expect(sorted.map((c) => c.id)).toEqual(["solo-low", "tie-high", "tie-low", "solo-high"]);
  });

  it("the secondary key's direction is independent of the primary key's direction", () => {
    const sorted = sortByKeys(cities, [
      { getValue: (c) => c.a, direction: "asc" },
      { getValue: (c) => c.b, direction: "desc" },
    ]);
    // Same primary order, but the tie now breaks the other way: tie-low (b=90) before tie-high (b=10).
    expect(sorted.map((c) => c.id)).toEqual(["solo-low", "tie-low", "tie-high", "solo-high"]);
  });

  it("never computes a combined/averaged value -- confirmed by a case a weighted average would order differently", () => {
    // If this were `a + b` or an average, tie-low (50+90=140) would beat
    // tie-high (50+10=60) outright regardless of key order. Multi-key sort
    // instead resolves purely by key priority: primary ties, so it falls
    // through to secondary -- never touches a combined number.
    const sorted = sortByKeys(cities, [
      { getValue: (c) => c.a, direction: "desc" },
      { getValue: (c) => c.b, direction: "asc" },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["solo-high", "tie-high", "tie-low", "solo-low"]);
  });

  it("a null on the primary key always sorts that item after non-null items, regardless of the secondary key", () => {
    const withNull: City[] = [
      { id: "no-primary", a: null, b: 1 },
      { id: "has-primary", a: 5, b: 99 },
    ];
    const sorted = sortByKeys(withNull, [
      { getValue: (c) => c.a, direction: "asc" },
      { getValue: (c) => c.b, direction: "asc" },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["has-primary", "no-primary"]);
  });

  it("falls through to the secondary key when both items tie as null on the primary key", () => {
    const bothNullPrimary: City[] = [
      { id: "x", a: null, b: 20 },
      { id: "y", a: null, b: 10 },
    ];
    const sorted = sortByKeys(bothNullPrimary, [
      { getValue: (c) => c.a, direction: "asc" },
      { getValue: (c) => c.b, direction: "asc" },
    ]);
    expect(sorted.map((c) => c.id)).toEqual(["y", "x"]);
  });

  it("returns a shallow copy, unsorted, when given zero keys", () => {
    const result = sortByKeys(cities, []);
    expect(result).toEqual(cities);
    expect(result).not.toBe(cities);
  });

  it("is stable and non-mutating", () => {
    const original = [...cities];
    sortByKeys(cities, [{ getValue: (c) => c.a, direction: "asc" }]);
    expect(cities).toEqual(original);
  });
});
