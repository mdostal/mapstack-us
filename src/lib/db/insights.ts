import type { ActiveLayer } from "@/lib/active-layers";
import { query, type SqlParam } from "@/lib/db/client";
import { effectiveYearFor } from "@/lib/db/effective-year";

/**
 * SQL-aggregate insights for a single (dataset, layer): min/max/avg across
 * every city with data, plus the top-N and bottom-N cities by value. Real
 * `MIN`/`MAX`/`AVG`/`ORDER BY ... LIMIT` queries -- the kind of "country-
 * wide metrics" aggregation the operator's north star calls out, not
 * practical to hand-roll well over the old plain-array approach. See
 * .pHive/epics/data-store/docs/design-note.md.
 */
export interface InsightCity {
  id: string;
  city: string;
  state: string;
  value: number;
}

export interface LayerInsights {
  min: number;
  max: number;
  avg: number;
  count: number;
  top: InsightCity[];
  bottom: InsightCity[];
}

export async function getLayerInsights(
  layer: ActiveLayer,
  year: number | null,
  limit = 3,
): Promise<LayerInsights | null> {
  const resolvedYear = effectiveYearFor(layer.datasetId, year);
  const params: SqlParam[] = [layer.datasetId, layer.layerId, resolvedYear];

  const [stats] = await query<{ min: number; max: number; avg: number; count: number }>(
    "SELECT MIN(value) as min, MAX(value) as max, AVG(value) as avg, COUNT(*) as count FROM layer_values WHERE dataset_id = ? AND layer_id = ? AND year IS ?",
    params,
  );
  if (!stats || stats.count === 0) return null;

  const rankedQuery = (direction: "DESC" | "ASC") =>
    `SELECT c.id, c.city, c.state, lv.value FROM layer_values lv JOIN cities c ON c.id = lv.city_id WHERE lv.dataset_id = ? AND lv.layer_id = ? AND lv.year IS ? ORDER BY lv.value ${direction} LIMIT ?`;

  const [top, bottom] = await Promise.all([
    query<InsightCity>(rankedQuery("DESC"), [...params, limit]),
    query<InsightCity>(rankedQuery("ASC"), [...params, limit]),
  ]);

  return { min: stats.min, max: stats.max, avg: stats.avg, count: stats.count, top, bottom };
}
