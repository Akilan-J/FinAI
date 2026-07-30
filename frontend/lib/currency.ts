export interface CurrencyInfo {
  code: string;
  symbol: string;
  name: string;
}

// Mirrors backend/app/services/currency.py SUPPORTED_CURRENCIES — keep in sync.
export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: "INR", symbol: "₹", name: "Indian Rupee" },
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
  { code: "SGD", symbol: "S$", name: "Singapore Dollar" },
  { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
];

const SYMBOL_BY_CODE: Record<string, string> = Object.fromEntries(
  SUPPORTED_CURRENCIES.map((c) => [c.code, c.symbol])
);

export function currencySymbol(code: string | null | undefined): string {
  if (!code) return "₹";
  return SYMBOL_BY_CODE[code.toUpperCase()] ?? code;
}

export function formatCurrency(
  amount: number | string,
  code: string | null | undefined,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const numeric = typeof amount === "string" ? parseFloat(amount) : amount;
  const symbol = currencySymbol(code);
  const formatted = (isNaN(numeric) ? 0 : numeric).toLocaleString(undefined, {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
  });
  return `${symbol}${formatted}`;
}
