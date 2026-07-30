import { describe, expect, it } from "vitest";
import { currencySymbol, formatCurrency } from "./currency";

describe("currencySymbol", () => {
  it("returns the correct symbol for known codes", () => {
    expect(currencySymbol("INR")).toBe("₹");
    expect(currencySymbol("USD")).toBe("$");
    expect(currencySymbol("usd")).toBe("$");
  });

  it("falls back to the code itself for unknown currencies", () => {
    expect(currencySymbol("ZZZ")).toBe("ZZZ");
  });

  it("defaults to ₹ for null/undefined", () => {
    expect(currencySymbol(null)).toBe("₹");
    expect(currencySymbol(undefined)).toBe("₹");
  });
});

describe("formatCurrency", () => {
  it("formats a number with the currency symbol and two decimals", () => {
    expect(formatCurrency(1234.5, "USD")).toBe("$1,234.50");
  });

  it("parses numeric strings", () => {
    expect(formatCurrency("500", "INR")).toBe("₹500.00");
  });

  it("treats invalid input as zero rather than throwing", () => {
    expect(formatCurrency("not-a-number", "INR")).toBe("₹0.00");
  });
});
