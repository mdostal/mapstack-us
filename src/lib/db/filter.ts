import type { ActiveLayer } from "@/lib/active-layers";
import { query, type SqlParam } from "@/lib/db/client";
import { effectiveYearFor } from "@/lib/db/effective-year";

/**
 * Multi-criteria filter over the SQLite store: "show me cities where grass
 * severity >= 60 AND violent crime <= 40" -- a real SQL join/WHERE across
 * 2+ layers, the kind of query that wasn't practical to hand-roll well over
 * the old plain-array approach. See
 * .pHive/epics/data-store/docs/design-note.md.
 */
export interface FilterCriterion {
  layer: ActiveLayer;
  min: number | null;
  max: number | null;
}

/**
 * Returns the set of city ids matching every criterion with a min and/or
 * max set. Returns `null` (not an empty set) when no criterion has a
 * threshold -- the caller should treat that as "no filter applied", not
 * "matches nothing".
 */
export async function filterCityIds(criteria: FilterCriterion[], year: number | null): Promise<Set<string> | null> {
  const active = criteria.filter((c) => c.min !== null || c.max !== null);
  if (active.length === 0) return null;

  const joins: string[] = [];
  const where: string[] = [];
  // The SQL string places every JOIN before the WHERE clause, so the params
  // array must follow that same order (join params first, in join order,
  // then where params, in where order) -- NOT interleaved per-criterion,
  // or the positional `?` bindings silently mismatch which value binds to
  // which placeholder.
  const joinParams: SqlParam[] = [];
  const whereParams: SqlParam[] = [];

  active.forEach((c, i) => {
    const alias = `lv${i}`;
    joins.push(
      `JOIN layer_values ${alias} ON ${alias}.city_id = c.id AND ${alias}.dataset_id = ? AND ${alias}.layer_id = ? AND ${alias}.year IS ?`,
    );
    joinParams.push(c.layer.datasetId, c.layer.layerId, effectiveYearFor(c.layer.datasetId, year));
    if (c.min !== null) {
      where.push(`${alias}.value >= ?`);
      whereParams.push(c.min);
    }
    if (c.max !== null) {
      where.push(`${alias}.value <= ?`);
      whereParams.push(c.max);
    }
  });

  const sql = `SELECT DISTINCT c.id FROM cities c ${joins.join(" ")}${where.length ? ` WHERE ${where.join(" AND ")}` : ""}`;
  const rows = await query<{ id: string }>(sql, [...joinParams, ...whereParams]);
  return new Set(rows.map((r) => r.id));
}
