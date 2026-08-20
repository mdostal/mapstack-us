import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TrendReportPanel } from "@/components/TrendReportPanel";
import type { ActiveLayer } from "@/lib/active-layers";

// Real dataset ids, not fabricated: allergy has no availableYears
// (current-snapshot only), crime genuinely has real multi-year history --
// this is the exact distinction the panel's empty-state logic depends on.
const SNAPSHOT_ONLY_LAYER: ActiveLayer = { datasetId: "allergy", layerId: "grass" };
const MULTI_YEAR_LAYER: ActiveLayer = { datasetId: "crime", layerId: "violent_crime" };

const CITY_IDS = ["new-york-ny", "los-angeles-ca"];

describe("TrendReportPanel", () => {
  it("renders nothing with no cities selected", () => {
    const { container } = render(<TrendReportPanel cityIds={[]} active={[MULTI_YEAR_LAYER]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an honest no-trend message when every active layer is snapshot-only, and never names a single dataset (would go stale as more get real history)", () => {
    render(<TrendReportPanel cityIds={CITY_IDS} active={[SNAPSHOT_ONLY_LAYER]} />);
    expect(screen.getByText(/No historical trend to show yet/)).toBeInTheDocument();
    expect(screen.getByText(/crime, income, unemployment/)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument(); // no chart svg
  });

  it("shows the same honest message with zero active layers at all", () => {
    render(<TrendReportPanel cityIds={CITY_IDS} active={[]} />);
    expect(screen.getByText(/No historical trend to show yet/)).toBeInTheDocument();
  });

  it("renders a real chart with one series per city for a genuinely multi-year layer", () => {
    render(<TrendReportPanel cityIds={CITY_IDS} active={[MULTI_YEAR_LAYER]} />);
    expect(screen.queryByText(/No historical trend to show yet/)).not.toBeInTheDocument();
    expect(screen.getByText(/Crime: Violent crime/)).toBeInTheDocument();
  });

  it("only plots layers with real multi-year data, silently skipping snapshot-only ones in a mixed selection", () => {
    render(<TrendReportPanel cityIds={CITY_IDS} active={[SNAPSHOT_ONLY_LAYER, MULTI_YEAR_LAYER]} />);
    expect(screen.getByText(/Crime: Violent crime/)).toBeInTheDocument();
    expect(screen.queryByText(/Allergy severity/)).not.toBeInTheDocument();
  });
});
