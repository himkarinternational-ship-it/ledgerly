import { money, round2 } from "@/lib/accounting/money";
import type { SupplyType } from "@/lib/supabase/types";

export interface LineItemInput {
  quantity: number;
  rate: number;
  discountPercent?: number;
  gstRate: number; // e.g. 18 for 18%
}

export interface LineItemGstResult {
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

/**
 * Determines supply type by comparing supplier state to place of supply.
 * Export is a separate explicit choice (invoice type / LUT), not inferred here.
 */
export function determineSupplyType(
  supplierStateCode: string | null | undefined,
  placeOfSupplyStateCode: string | null | undefined
): SupplyType {
  if (!supplierStateCode || !placeOfSupplyStateCode) return "intra_state";
  return supplierStateCode === placeOfSupplyStateCode ? "intra_state" : "inter_state";
}

/**
 * Computes tax for a single invoice line item.
 * Intra-state: split gstRate into CGST + SGST (half each).
 * Inter-state / export: full gstRate as IGST (export at 0% if under LUT — pass gstRate 0).
 */
export function calculateLineItemGst(
  input: LineItemInput,
  supplyType: SupplyType
): LineItemGstResult {
  const gross = money(input.quantity).times(input.rate);
  const discountPct = money(input.discountPercent ?? 0);
  const discountAmount = gross.times(discountPct).dividedBy(100);
  const taxableValue = gross.minus(discountAmount);

  const gstRate = money(input.gstRate ?? 0);

  let cgst = money(0);
  let sgst = money(0);
  let igst = money(0);

  if (supplyType === "intra_state") {
    const half = gstRate.dividedBy(2);
    cgst = taxableValue.times(half).dividedBy(100);
    sgst = taxableValue.times(half).dividedBy(100);
  } else {
    // inter_state, export (with IGST), import
    igst = taxableValue.times(gstRate).dividedBy(100);
  }

  const total = taxableValue.plus(cgst).plus(sgst).plus(igst);

  return {
    taxableValue: round2(taxableValue),
    cgstAmount: round2(cgst),
    sgstAmount: round2(sgst),
    igstAmount: round2(igst),
    totalAmount: round2(total),
  };
}

export interface InvoiceTotals {
  subtotal: number;
  discountTotal: number;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  roundOff: number;
  totalAmount: number;
}

/**
 * Aggregates a full set of line items into invoice-level totals, including
 * the standard round-off-to-nearest-rupee behaviour used on Indian invoices.
 */
export function calculateInvoiceTotals(
  lines: Array<LineItemInput & { taxableValue?: number }>,
  supplyType: SupplyType
): InvoiceTotals {
  let subtotal = money(0);
  let discountTotal = money(0);
  let taxableValue = money(0);
  let cgstAmount = money(0);
  let sgstAmount = money(0);
  let igstAmount = money(0);

  for (const line of lines) {
    const gross = money(line.quantity).times(line.rate);
    const discountPct = money(line.discountPercent ?? 0);
    const discountAmount = gross.times(discountPct).dividedBy(100);
    const lineTaxable = gross.minus(discountAmount);

    const result = calculateLineItemGst(line, supplyType);

    subtotal = subtotal.plus(gross);
    discountTotal = discountTotal.plus(discountAmount);
    taxableValue = taxableValue.plus(lineTaxable);
    cgstAmount = cgstAmount.plus(result.cgstAmount);
    sgstAmount = sgstAmount.plus(result.sgstAmount);
    igstAmount = igstAmount.plus(result.igstAmount);
  }

  const preRoundTotal = taxableValue.plus(cgstAmount).plus(sgstAmount).plus(igstAmount);
  const roundedTotal = preRoundTotal.toDecimalPlaces(0, 4); // round-half-up to nearest rupee
  const roundOff = roundedTotal.minus(preRoundTotal);

  return {
    subtotal: round2(subtotal),
    discountTotal: round2(discountTotal),
    taxableValue: round2(taxableValue),
    cgstAmount: round2(cgstAmount),
    sgstAmount: round2(sgstAmount),
    igstAmount: round2(igstAmount),
    roundOff: round2(roundOff),
    totalAmount: round2(roundedTotal),
  };
}

// Indian GST state codes, used for place-of-supply dropdowns and GSTIN validation
export const GST_STATE_CODES: Record<string, string> = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
  "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana", "07": "Delhi",
  "08": "Rajasthan", "09": "Uttar Pradesh", "10": "Bihar", "11": "Sikkim",
  "12": "Arunachal Pradesh", "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
  "16": "Tripura", "17": "Meghalaya", "18": "Assam", "19": "West Bengal",
  "20": "Jharkhand", "21": "Odisha", "22": "Chhattisgarh", "23": "Madhya Pradesh",
  "24": "Gujarat", "25": "Daman and Diu", "26": "Dadra and Nagar Haveli",
  "27": "Maharashtra", "28": "Andhra Pradesh (Old)", "29": "Karnataka",
  "30": "Goa", "31": "Lakshadweep", "32": "Kerala", "33": "Tamil Nadu",
  "34": "Puducherry", "35": "Andaman and Nicobar Islands", "36": "Telangana",
  "37": "Andhra Pradesh", "38": "Ladakh",
};

/** Basic structural validation of a GSTIN (15 chars, standard pattern). Not a live GSTN check. */
export function isValidGstinFormat(gstin: string): boolean {
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return pattern.test(gstin.trim().toUpperCase());
}

export function gstinStateCode(gstin: string): string | null {
  if (!gstin || gstin.length < 2) return null;
  return gstin.slice(0, 2);
}
