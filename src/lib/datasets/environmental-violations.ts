import environmentalViolationsData from "@data/environmental-violations.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The fortieth real Dataset -- density of EPA facilities in
 * "Significant Violation" compliance status within 10 miles of each
 * city, ddr11-1 (data-drive-round-11 epic). Real EPA ECHO (Enforcement
 * and Compliance History Online) Exporter bulk file, genuinely distinct
 * from the data.epa.gov Envirofacts APIs already used for
 * tri-facility-density.ts and superfund.ts. See
 * scripts/gen_environmental_violations_data.py.
 *
 * A real mid-build pivot: ECHO's live REST API (server-side radius
 * query, the same pattern proven by historic-site-density.ts) worked and
 * returned real, plausible values, but hit a real documented rate limit
 * (300 requests/hour) partway through a full 512-city run. Pivoted to
 * ECHO's own bulk "Exporter" file instead -- a real facility-level file
 * with lat/lon, joined locally via haversine (radius join,
 * tri-facility-density.ts's precedent). FAC_COMPLIANCE_STATUS ==
 * 'Significant Violation' is the real, populated field used (the file's
 * own FAC_SNC_FLG column, despite its name, is 'N' for every single row
 * in this export -- confirmed by a full-file scan).
 *
 * One layer: real count of nearby facilities in Significant Violation
 * status (across the Clean Air Act, Clean Water Act, and RCRA
 * hazardous-waste programs combined) within 10mi, direct rescale capped
 * at a real, checked p90 (35), higher count = more concerning -- a
 * genuinely distinct signal from TRI (toxic release reporting volume)
 * and Superfund (contaminated-site remediation status). 512/512 real
 * coverage -- a 0-count response is a valid real value, not a
 * missing-data null.
 */
interface EnvironmentalViolationsRecord {
  significant_violations_within_10mi: number;
  concern: number;
}

const DATA = environmentalViolationsData as unknown as Record<string, EnvironmentalViolationsRecord> & { _meta: unknown };

function getEnvironmentalViolationsValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "environmental_violations") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const violationWord = record.significant_violations_within_10mi === 1 ? "facility" : "facilities";
  return {
    value: record.concern,
    detail: `${record.significant_violations_within_10mi} ${violationWord} in significant violation within 10 miles -- EPA ECHO (Enforcement and Compliance History Online)`,
  };
}

export const environmentalViolationsDataset: Dataset = {
  id: "environmental-violations",
  label: "Environmental violations",
  description: "Real EPA ECHO significant-violation facility density within 10mi -- higher count = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/environmental-violations-methodology.md",
  supportsTime: false,
  layers: [{ id: "environmental_violations", label: "Environmental violations" }],
  getValue: getEnvironmentalViolationsValue,
};
