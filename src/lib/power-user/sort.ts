/**
 * Single-criterion sort for the power-user comparison table. Deliberately
 * does NOT combine values across columns -- see
 * .pHive/epics/power-user-tab/docs/design-discussion.md §3.3 for why a
 * cross-dataset combined/weighted score was dropped from this epic's scope
 * after the grill pass (findings U1/P1).
 */
export type SortDirection = "asc" | "desc";

/**
 * Sorts `items` by `getValue(item)`. Items with a null value (no data for
 * that city/layer) always sort to the end, regardless of direction, rather
 * than participating in the comparison arbitrarily.
 */
export function sortByValue<T>(items: T[], getValue: (item: T) => number | null, direction: SortDirection): T[] {
  const withData: Array<{ item: T; value: number }> = [];
  const withoutData: T[] = [];

  for (const item of items) {
    const value = getValue(item);
    if (value === null) {
      withoutData.push(item);
    } else {
      withData.push({ item, value });
    }
  }

  withData.sort((a, b) => (direction === "asc" ? a.value - b.value : b.value - a.value));

  return [...withData.map((w) => w.item), ...withoutData];
}
