import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { InsightsPanel } from "@/components/InsightsPanel";
import type { ActiveLayer } from "@/lib/active-layers";
import { getLayerInsights } from "@/lib/db/insights";

vi.mock("@/lib/db/insights", () => ({
  getLayerInsights: vi.fn(),
}));

const LAYER: ActiveLayer = { datasetId: "crime", layerId: "violent_crime" };
const mockedGetLayerInsights = vi.mocked(getLayerInsights);

beforeEach(() => {
  mockedGetLayerInsights.mockReset();
});

describe("InsightsPanel", () => {
  it("renders nothing with no selected layers", () => {
    const { container } = render(<InsightsPanel selected={[]} year={null} onSelectCity={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows a loading state before the query resolves", () => {
    mockedGetLayerInsights.mockReturnValue(new Promise(() => {})); // never resolves
    render(<InsightsPanel selected={[LAYER]} year={null} onSelectCity={vi.fn()} />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("shows the real min/avg/max/count once the query resolves", async () => {
    mockedGetLayerInsights.mockResolvedValue({
      min: 12,
      max: 98,
      avg: 55,
      count: 512,
      top: [{ id: "chicago-il", city: "Chicago", state: "IL", value: 98 }],
      bottom: [{ id: "boise-id", city: "Boise", state: "ID", value: 12 }],
    });
    render(<InsightsPanel selected={[LAYER]} year={null} onSelectCity={vi.fn()} />);

    await waitFor(() => expect(screen.getByText(/min 12/)).toBeInTheDocument());
    expect(screen.getByText(/avg 55/)).toBeInTheDocument();
    expect(screen.getByText(/max 98/)).toBeInTheDocument();
    expect(screen.getByText(/512 cities/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Chicago, IL/ })).toBeInTheDocument();
  });

  it("shows a real no-data message when the query resolves to null, not a fabricated value", async () => {
    mockedGetLayerInsights.mockResolvedValue(null);
    render(<InsightsPanel selected={[LAYER]} year={null} onSelectCity={vi.fn()} />);
    await waitFor(() => expect(screen.getByText("No data for this selection.")).toBeInTheDocument());
  });

  it("shows an error message and never gets stuck on Loading forever when the query rejects -- the real fix, not the old silent-swallow bug", async () => {
    mockedGetLayerInsights.mockRejectedValue(new Error("sqlite unavailable"));
    render(<InsightsPanel selected={[LAYER]} year={null} onSelectCity={vi.fn()} />);

    await waitFor(() => expect(screen.getByText("Insights are unavailable right now.")).toBeInTheDocument());
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
  });

  it("calls onSelectCity when a top/bottom city button is clicked", async () => {
    mockedGetLayerInsights.mockResolvedValue({
      min: 12,
      max: 98,
      avg: 55,
      count: 512,
      top: [{ id: "chicago-il", city: "Chicago", state: "IL", value: 98 }],
      bottom: [],
    });
    const onSelectCity = vi.fn();
    render(<InsightsPanel selected={[LAYER]} year={null} onSelectCity={onSelectCity} />);

    const cityButton = await screen.findByRole("button", { name: /Chicago, IL/ });
    cityButton.click();
    expect(onSelectCity).toHaveBeenCalledWith("chicago-il");
  });
});
