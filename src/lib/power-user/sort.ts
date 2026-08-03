/**
 * Multi-key sort for the power-user comparison table: sort by a primary
 * column, break ties with a secondary, tertiary, etc. This is a sequence of
 * INDEPENDENT column comparisons (SQL `ORDER BY col1, col2` semantics) --
 * no column's value is ever combined, weighted, or averaged with another's.
 * That distinction matters: a cross-dataset COMBINED score was explicitly
 * rejected for this project (see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §3.3, grill-record
 * findings U1/P1) because the underlying 0-100 scores aren't on a common
 * statistical basis (crime = year-scoped percentile rank, allergy =
 * climate-modeled score, etc.) -- averaging them produces a number with no
 * well-defined meaning. Multi-key sort never computes that number; each
 * column stays independently visible and independently compared, in
 * sequence, exactly like sorting a spreadsheet by column A then column B.
 */
export type SortDirection = "asc" | "desc";

export interface SortKey<T> {
  getValue: (item: T) => number | null;
  direction: SortDirection;
}

/**
 * Items with a null value on a given key always sort after items with data
 * on that same key, regardless of direction, rather than participating in
 * the comparison arbitrarily. A null vs. null comparison is a tie -- it
 * falls through to the next key rather than deciding the order.
 */
function compareByKeys<T>(a: T, b: T, keys: SortKey<T>[]): number {
  for (const key of keys) {
    const va = key.getValue(a);
    const vb = key.getValue(b);
    if (va === null && vb === null) continue;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (va !== vb) return key.direction === "asc" ? va - vb : vb - va;
  }
  return 0;
}

/** Sorts `items` by one or more keys in priority order. Stable and
 * non-mutating -- relies on Array.prototype.sort's spec-guaranteed
 * stability (ES2019+) so ties (including all-null input) preserve the
 * original relative order. */
export function sortByKeys<T>(items: T[], keys: SortKey<T>[]): T[] {
  if (keys.length === 0) return [...items];
  return [...items].sort((a, b) => compareByKeys(a, b, keys));
}

/** Single-key convenience wrapper -- the pu-2 (v1) shape, kept as-is since
 * most callers only ever sort by one column. */
export function sortByValue<T>(items: T[], getValue: (item: T) => number | null, direction: SortDirection): T[] {
  return sortByKeys(items, [{ getValue, direction }]);
}
