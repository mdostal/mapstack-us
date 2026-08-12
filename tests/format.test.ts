import { describe, expect, it } from "vitest";
import { toOrdinal } from "@/lib/datasets/format";

describe("toOrdinal", () => {
  it("appends 'st' to a decimal value ending in 1", () => {
    expect(toOrdinal(82.1)).toBe("82.1st");
  });

  it("appends 'nd' to a decimal value ending in 2", () => {
    expect(toOrdinal(45.2)).toBe("45.2nd");
  });

  it("appends 'rd' to a decimal value ending in 3", () => {
    expect(toOrdinal(3.3)).toBe("3.3rd");
  });

  it("appends 'th' to a decimal value ending in 0 or 4-9", () => {
    expect(toOrdinal(50.0)).toBe("50th"); // 50.0 -> "50" (no trailing zero kept by String())
    expect(toOrdinal(12.4)).toBe("12.4th");
    expect(toOrdinal(99.9)).toBe("99.9th");
  });

  it("applies the classic 11th/12th/13th exception to whole numbers", () => {
    expect(toOrdinal(11)).toBe("11th");
    expect(toOrdinal(12)).toBe("12th");
    expect(toOrdinal(13)).toBe("13th");
    expect(toOrdinal(111)).toBe("111th");
  });

  it("applies the plain last-digit rule to whole numbers outside the teens exception", () => {
    expect(toOrdinal(1)).toBe("1st");
    expect(toOrdinal(21)).toBe("21st");
    expect(toOrdinal(2)).toBe("2nd");
    expect(toOrdinal(3)).toBe("3rd");
    expect(toOrdinal(100)).toBe("100th");
  });

  it("does not apply the teens exception to a fractional tail (e.g. X.11 is not 'eleventh')", () => {
    expect(toOrdinal(5.11)).toBe("5.11st");
  });
});
