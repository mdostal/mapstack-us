import superfundData from "@data/superfund.json";
import type { Dataset, DatasetLayerValue } from "@/lib/datasets/types";

/**
 * The thirty-fourth real Dataset -- EPA Superfund/NPL site density,
 * ddr5-1 (data-drive-round-5 epic). Resolves a lead deferred since
 * dataset-verification-drive's addendum -- three prior attempts
 * guessing Envirofacts table names against the legacy efservice
 * endpoint all failed. The real fix: EPA's own Envirofacts docs page
 * revealed a newer dmapservice API base and program-prefixed table
 * names (sems.envirofacts_site) -- the same docs-rendering technique
 * that resolved FBI hate crime in ddr4. See
 * scripts/gen_superfund_data.py.
 *
 * Every record carries a real county fips_code -- reuses the existing
 * city->county crosswalk directly, unlike the abandoned drinking-water
 * attempt earlier this round.
 *
 * One layer: real count of npl_status_code='F' (Final NPL -- the
 * currently-active Superfund site status) sites per county, direct
 * rescale, higher count = more concerning.
 */
interface SuperfundRecord {
  final_npl_site_count: number;
  county: string;
  score: number;
}

const DATA = superfundData as unknown as Record<string, SuperfundRecord> & { _meta: unknown };

function getSuperfundValue(cityId: string, layerId: string): DatasetLayerValue | null {
  if (layerId !== "superfund_density") return null;
  const record = DATA[cityId];
  if (!record) return null;

  const siteWord = record.final_npl_site_count === 1 ? "site" : "sites";
  return {
    value: record.score,
    detail: `${record.final_npl_site_count} active Superfund (Final NPL) ${siteWord} in ${record.county} County -- EPA Envirofacts SEMS`,
  };
}

export const superfundDataset: Dataset = {
  id: "superfund",
  label: "Superfund site density",
  description: "Real EPA Superfund (National Priorities List) site density -- county-level, higher count = more concerning.",
  methodologyUrl: "https://github.com/mdostal/mapstack-us/blob/main/data/superfund-methodology.md",
  supportsTime: false,
  layers: [{ id: "superfund_density", label: "Superfund site density" }],
  getValue: getSuperfundValue,
};
