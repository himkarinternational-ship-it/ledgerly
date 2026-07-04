import Decimal from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/** Wrap a number/string safely as a Decimal for money math. */
export function money(value: number | string | Decimal): Decimal {
  return new Decimal(value ?? 0);
}

/** Round to 2 decimal places (paise), the standard for INR storage. */
export function round2(value: Decimal | number | string): number {
  return new Decimal(value).toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
}

/** Format a number as INR currency, e.g. 125000 -> "₹1,25,000.00" */
export function formatINR(value: number | string | Decimal, opts?: { withSymbol?: boolean }): string {
  const num = new Decimal(value ?? 0).toDecimalPlaces(2).toNumber();
  const withSymbol = opts?.withSymbol ?? true;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return withSymbol ? `₹${formatted}` : formatted;
}

/** Convert a number to words (Indian numbering system) for invoice totals. */
export function numberToWordsINR(value: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function twoDigits(n: number): string {
    if (n < 20) return ones[n];
    return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
  }

  function threeDigits(n: number): string {
    if (n >= 100) {
      return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + twoDigits(n % 100) : "");
    }
    return twoDigits(n);
  }

  const rounded = Math.round(value);
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - Math.floor(rounded)) * 100);

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let n = rupees;
  const crore = Math.floor(n / 10000000); n %= 10000000;
  const lakh = Math.floor(n / 100000); n %= 100000;
  const thousand = Math.floor(n / 1000); n %= 1000;
  const hundred = n;

  const parts: string[] = [];
  if (crore) parts.push(threeDigits(crore) + " Crore");
  if (lakh) parts.push(threeDigits(lakh) + " Lakh");
  if (thousand) parts.push(threeDigits(thousand) + " Thousand");
  if (hundred) parts.push(threeDigits(hundred));

  let result = parts.join(" ") + " Rupees";
  if (paise) result += " and " + twoDigits(paise) + " Paise";
  return result + " Only";
}
