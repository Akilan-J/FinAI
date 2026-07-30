import { describe, expect, it } from "vitest";
import { formatDateToDDMMYYYY, dbDateToInputDate, inputDateToDbDate } from "./utils";

describe("formatDateToDDMMYYYY", () => {
  it("formats a YYYY-MM-DD string without timezone shift", () => {
    expect(formatDateToDDMMYYYY("2026-07-05")).toBe("05/07/2026");
  });

  it("returns an em dash for null/undefined", () => {
    expect(formatDateToDDMMYYYY(null)).toBe("—");
    expect(formatDateToDDMMYYYY(undefined)).toBe("—");
  });

  it("returns an em dash for an invalid date string", () => {
    expect(formatDateToDDMMYYYY("not-a-date")).toBe("—");
  });

  it("formats a Date object", () => {
    expect(formatDateToDDMMYYYY(new Date(2026, 0, 15))).toBe("15/01/2026");
  });
});

describe("dbDateToInputDate", () => {
  it("converts YYYY-MM-DD to DD/MM/YYYY", () => {
    expect(dbDateToInputDate("2026-07-05")).toBe("05/07/2026");
  });

  it("returns empty string for falsy input", () => {
    expect(dbDateToInputDate(null)).toBe("");
    expect(dbDateToInputDate(undefined)).toBe("");
    expect(dbDateToInputDate("")).toBe("");
  });
});

describe("inputDateToDbDate", () => {
  it("converts DD/MM/YYYY to YYYY-MM-DD", () => {
    expect(inputDateToDbDate("05/07/2026")).toBe("2026-07-05");
  });

  it("passes through strings that don't match the expected pattern", () => {
    expect(inputDateToDbDate("2026-07-05")).toBe("2026-07-05");
  });

  it("returns empty string for falsy input", () => {
    expect(inputDateToDbDate(null)).toBe("");
  });
});
