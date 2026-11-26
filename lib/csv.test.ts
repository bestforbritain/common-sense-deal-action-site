import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("quotes commas, quotes and line breaks", () => {
    expect(csvCell('Taylor\'s "Bakery", Ltd')).toBe('"Taylor\'s ""Bakery"", Ltd"');
    expect(csvCell("line 1\nline 2")).toBe('"line 1\nline 2"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("+44 20")).toBe("'+44 20");
  });

  it("writes a header row, CRLF line endings and a UTF-8 BOM", () => {
    expect(toCsv(["a", "b"], [[1, null]])).toBe("﻿a,b\r\n1,\r\n");
  });
});
