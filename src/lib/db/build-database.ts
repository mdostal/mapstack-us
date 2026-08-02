import type { Database, SqlJsStatic } from "sql.js";
import cities from "@data/cities.json";
import { DATASETS } from "@/lib/datasets/registry";

export const SCHEMA = `
CREATE TABLE cities (
  id TEXT PRIMARY KEY,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  lat REAL,
  lon REAL,
  pop INTEGER,
  elevation_ft INTEGER,
  koppen TEXT,
  coastal INTEGER
);

CREATE TABLE datasets (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  description TEXT,
  methodology_url TEXT,
  supports_time INTEGER NOT NULL
);

CREATE TABLE dataset_years (
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  year INTEGER NOT NULL,
  PRIMARY KEY (dataset_id, year)
);

CREATE TABLE layers (
  dataset_id TEXT NOT NULL REFERENCES datasets(id),
  layer_id TEXT NOT NULL,
  label TEXT NOT NULL,
  PRIMARY KEY (dataset_id, layer_id)
);

CREATE TABLE layer_values (
  city_id TEXT NOT NULL REFERENCES cities(id),
  dataset_id TEXT NOT NULL,
  layer_id TEXT NOT NULL,
  year INTEGER,
  value REAL NOT NULL,
  tier TEXT,
  detail TEXT NOT NULL,
  PRIMARY KEY (city_id, dataset_id, layer_id, year)
);

CREATE INDEX idx_layer_values_lookup ON layer_values (dataset_id, layer_id, year);
CREATE INDEX idx_cities_city ON cities (city);
CREATE INDEX idx_cities_state ON cities (state);
`;

/**
 * Builds the queryable projection of the app's real data -- see
 * scripts/build-sqlite.ts (CLI entry that exports this to public/data.sqlite)
 * and .pHive/epics/data-store/docs/design-note.md. Renders through the REAL
 * `DATASETS` registry (the same getValue() every UI component calls), never
 * re-derives scoring from raw JSON, so there is exactly one implementation
 * of scoring logic.
 */
export function buildDatabase(SQL: SqlJsStatic): { db: Database; valueCount: number } {
  const db = new SQL.Database();
  db.run(SCHEMA);

  const insertCity = db.prepare(
    "INSERT INTO cities (id, city, state, lat, lon, pop, elevation_ft, koppen, coastal) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  for (const c of cities) {
    insertCity.run([c.id, c.city, c.state, c.lat, c.lon, c.pop, c.elevation_ft, c.koppen, c.coastal ? 1 : 0]);
  }
  insertCity.free();

  const insertDataset = db.prepare(
    "INSERT INTO datasets (id, label, description, methodology_url, supports_time) VALUES (?, ?, ?, ?, ?)",
  );
  const insertYear = db.prepare("INSERT INTO dataset_years (dataset_id, year) VALUES (?, ?)");
  const insertLayer = db.prepare("INSERT INTO layers (dataset_id, layer_id, label) VALUES (?, ?, ?)");
  const insertValue = db.prepare(
    "INSERT INTO layer_values (city_id, dataset_id, layer_id, year, value, tier, detail) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  let valueCount = 0;
  for (const dataset of DATASETS) {
    insertDataset.run([
      dataset.id,
      dataset.label,
      dataset.description,
      dataset.methodologyUrl,
      dataset.supportsTime ? 1 : 0,
    ]);

    for (const year of dataset.availableYears ?? []) {
      insertYear.run([dataset.id, year]);
    }

    for (const layer of dataset.layers) {
      insertLayer.run([dataset.id, layer.id, layer.label]);

      const years = dataset.supportsTime && dataset.availableYears?.length ? dataset.availableYears : [null];
      for (const year of years) {
        for (const city of cities) {
          const context = year !== null ? { year } : undefined;
          const result = dataset.getValue(city.id, layer.id, context);
          if (!result) continue;
          insertValue.run([city.id, dataset.id, layer.id, year, result.value, result.tier ?? null, result.detail]);
          valueCount++;
        }
      }
    }
  }
  insertDataset.free();
  insertYear.free();
  insertLayer.free();
  insertValue.free();

  return { db, valueCount };
}
