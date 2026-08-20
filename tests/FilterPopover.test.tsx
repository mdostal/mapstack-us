import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { FilterPopover } from "@/components/FilterPopover";
import type { ActiveLayer } from "@/lib/active-layers";

// FilterPopover requires 2+ selected layers to render at all -- real
// dataset ids from the registry, since FilterPanel resolves them.
const TWO_LAYERS: ActiveLayer[] = [
  { datasetId: "crime", layerId: "violent_crime" },
  { datasetId: "unemployment", layerId: "unemployment_rate" },
];

function renderPopover(onFilterChange = vi.fn()) {
  return { onFilterChange, ...render(<FilterPopover selected={TWO_LAYERS} year={null} isActive={false} onFilterChange={onFilterChange} />) };
}

describe("FilterPopover", () => {
  it("renders nothing with fewer than 2 selected layers", () => {
    const { container } = render(
      <FilterPopover selected={[TWO_LAYERS[0]]} year={null} isActive={false} onFilterChange={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("starts closed", () => {
    renderPopover();
    expect(screen.queryByText(/apply/i)).not.toBeInTheDocument();
  });

  it("opens on a real click of the trigger button", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: /^Filter/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("closes on a real Escape keydown and returns focus to the trigger -- the actual fix, not just markup", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: /^Filter/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.keyDown(document, { key: "Escape" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
  });

  it("closes on a real click outside the popover", () => {
    renderPopover();
    const trigger = screen.getByRole("button", { name: /^Filter/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.pointerDown(document.body);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  it("shows an 'active' style cue when isActive is true", () => {
    render(<FilterPopover selected={TWO_LAYERS} year={null} isActive={true} onFilterChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Filter/ })).toHaveTextContent("active");
  });
});
