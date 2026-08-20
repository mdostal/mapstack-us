import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CityMarker } from "@/components/CityMarker";
import type { CityPoint } from "@/components/BaseSvgMap";

const POINT: CityPoint = {
  city: { id: "austin-tx", city: "Austin", state: "TX", lat: 30.27, lon: -97.74 } as CityPoint["city"],
  x: 12.3,
  y: 45.6,
};

function renderMarker(props: Partial<React.ComponentProps<typeof CityMarker>> = {}) {
  return render(
    <svg>
      <CityMarker point={POINT} isSelected={false} fill="red" {...props} />
    </svg>,
  );
}

describe("CityMarker", () => {
  it("labels itself with the real city and state", () => {
    renderMarker();
    expect(screen.getByRole("button", { name: "Austin, TX" })).toBeInTheDocument();
  });

  it("appends the tooltip to the accessible label when provided", () => {
    renderMarker({ tooltip: "72/100, high" });
    expect(screen.getByRole("button", { name: "Austin, TX — 72/100, high" })).toBeInTheDocument();
  });

  it("is not keyboard-focusable when no onSelect is provided (a static preview marker)", () => {
    renderMarker();
    const marker = screen.getByRole("button", { name: "Austin, TX" });
    expect(marker).not.toHaveAttribute("tabindex");
  });

  it("is keyboard-focusable (tabIndex 0) when onSelect is provided -- the real WCAG 2.1.1 fix", () => {
    renderMarker({ onSelect: vi.fn() });
    const marker = screen.getByRole("button", { name: "Austin, TX" });
    expect(marker).toHaveAttribute("tabindex", "0");
  });

  it("calls onSelect on a real click", () => {
    const onSelect = vi.fn();
    renderMarker({ onSelect });
    fireEvent.click(screen.getByRole("button", { name: "Austin, TX" }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onSelect on a real Enter keydown -- the actual keyboard-operability fix, not just tabIndex", () => {
    const onSelect = vi.fn();
    renderMarker({ onSelect });
    fireEvent.keyDown(screen.getByRole("button", { name: "Austin, TX" }), { key: "Enter" });
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("calls onSelect on a real Space keydown", () => {
    const onSelect = vi.fn();
    renderMarker({ onSelect });
    fireEvent.keyDown(screen.getByRole("button", { name: "Austin, TX" }), { key: " " });
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("does not call onSelect on an unrelated key", () => {
    const onSelect = vi.fn();
    renderMarker({ onSelect });
    fireEvent.keyDown(screen.getByRole("button", { name: "Austin, TX" }), { key: "Escape" });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders a larger radius and a dark stroke when selected", () => {
    const { container: selected } = renderMarker({ isSelected: true });
    const { container: unselected } = renderMarker({ isSelected: false });
    const selectedCircle = selected.querySelector("circle")!;
    const unselectedCircle = unselected.querySelector("circle")!;
    expect(Number(selectedCircle.getAttribute("r"))).toBeGreaterThan(Number(unselectedCircle.getAttribute("r")));
    expect(selectedCircle.getAttribute("stroke")).toBe("#111827");
    expect(unselectedCircle.getAttribute("stroke")).toBe("white");
  });

  it("honors an explicit radius override regardless of selection state", () => {
    const { container } = renderMarker({ radius: 9, isSelected: true });
    expect(container.querySelector("circle")!.getAttribute("r")).toBe("9");
  });
});
