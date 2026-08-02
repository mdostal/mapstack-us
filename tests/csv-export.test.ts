import { describe, expect, it } from "vitest";
import { buildCsv } from "@/lib/power-user/csv-export";

describe("csv-export", () => {
  it("builds a header row from 'City' plus each column header", () => {
    const csv = buildCsv(
      [{ id: "a", label: "Anytown, CA" }],
      [{ header: "Allergy severity: Grass", getValue: () => "72/100, high" }],
    );
    expect(csv.split("\n")[0]).toBe("City,Allergy severity: Grass");
  });

  it("builds one data row per city, calling each column's getValue with the city id", () => {
    const csv = buildCsv(
      [
        { id: "a", label: "Anytown" },
        { id: "b", label: "Otherville" },
      ],
      [{ header: "Grass", getValue: (id) => (id === "a" ? "72/100" : "10/100") }],
    );
    const lines = csv.split("\n");
    expect(lines[1]).toBe("Anytown,72/100");
    expect(lines[2]).toBe("Otherville,10/100");
  });

  it("quotes and escapes a field containing a comma", () => {
    const csv = buildCsv([{ id: "a", label: "Springfield, IL" }], []);
    expect(csv.split("\n")[1]).toBe('"Springfield, IL"');
  });

  it("quotes and doubles internal quotes in a field containing a double quote", () => {
    const csv = buildCsv([{ id: "a", label: 'The "Big" City' }], []);
    expect(csv.split("\n")[1]).toBe('"The ""Big"" City"');
  });

  it("does not quote a field with no comma/quote/newline", () => {
    const csv = buildCsv([{ id: "a", label: "Anytown" }], [{ header: "Grass", getValue: () => "No data" }]);
    expect(csv.split("\n")[1]).toBe("Anytown,No data");
  });

  it("produces just the header row when there are no cities", () => {
    const csv = buildCsv([], [{ header: "Grass", getValue: () => "" }]);
    expect(csv).toBe("City,Grass");
  });
});
