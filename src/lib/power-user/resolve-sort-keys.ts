import { resolveActiveLayer, type ActiveLayer } from "@/lib/active-layers";
import type { DatasetTimeContext } from "@/lib/datasets/types";
import type { SortDirection, SortKey } from "@/lib/power-user/sort";

/** One sortable column + direction, in priority order (primary first) --
 * see sort.ts's header comment for why a list of these is a tie-break
 * sequence, never a combined score. */
export interface SortSpec {
  layer: ActiveLayer;
  direction: SortDirection;
}

interface HasId {
  id: string;
}

/**
 * Resolves sort specs (dataset/layer references) into live SortKeys backed
 * by the real Dataset.getValue() -- shared by ComparisonTable and
 * buildComparisonCsv so both apply identical sort semantics rather than
 * each re-deriving it. A spec whose layer no longer resolves (e.g. removed
 * from `selected`, or from an older saved view referencing a layer that no
 * longer exists) resolves to a key that's always null, which falls through
 * to the next key per sort.ts's null handling rather than throwing.
 */
export function resolveSortKeys<T extends HasId>(
  specs: SortSpec[],
  context: DatasetTimeContext | undefined,
): SortKey<T>[] {
  return specs.map((spec) => {
    const resolved = resolveActiveLayer(spec.layer);
    return {
      getValue: (item: T) => (resolved ? (resolved.dataset.getValue(item.id, resolved.layer.id, context)?.value ?? null) : null),
      direction: spec.direction,
    };
  });
}
