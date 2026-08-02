/**
 * Client-side CSV export of the comparison table's current (filtered,
 * sorted) view -- no backend, matches the operator's stated north-star
 * "get exports and data analysis" without needing any write access/backend
 * work. See .pHive/epics/data-store/docs/design-note.md.
 */
export interface CsvColumn {
  header: string;
  getValue: (cityId: string) => string;
}

export interface CsvRow {
  id: string;
  label: string;
}

function escapeCsvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function buildCsv(rows: CsvRow[], columns: CsvColumn[]): string {
  const header = ["City", ...columns.map((c) => c.header)].map(escapeCsvField).join(",");
  const lines = rows.map((row) => [row.label, ...columns.map((c) => c.getValue(row.id))].map(escapeCsvField).join(","));
  return [header, ...lines].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
