"use client";

// Lightweight client-side mirror of lib/gst/calculator.ts for live UI preview.
// The server action recalculates authoritatively with Decimal.js before persisting,
// so floating-point drift here only affects the on-screen preview, never stored data.

export interface PreviewLineItem {
  quantity: number;
  rate: number;
  discountPercent: number;
  gstRate: number;
}

export function previewLineTotals(li: PreviewLineItem, supplyType: "intra_state" | "inter_state" | "export") {
  const gross = li.quantity * li.rate;
  const discountAmount = (gross * li.discountPercent) / 100;
  const taxableValue = gross - discountAmount;

  let cgst = 0, sgst = 0, igst = 0;
  if (supplyType === "intra_state") {
    cgst = (taxableValue * li.gstRate) / 200;
    sgst = (taxableValue * li.gstRate) / 200;
  } else {
    igst = (taxableValue * li.gstRate) / 100;
  }

  const total = taxableValue + cgst + sgst + igst;
  return { taxableValue, cgst, sgst, igst, total };
}

export function previewInvoiceTotals(lines: PreviewLineItem[], supplyType: "intra_state" | "inter_state" | "export") {
  let subtotal = 0, discountTotal = 0, taxableValue = 0, cgst = 0, sgst = 0, igst = 0;

  for (const li of lines) {
    const gross = li.quantity * li.rate;
    const discountAmount = (gross * li.discountPercent) / 100;
    subtotal += gross;
    discountTotal += discountAmount;
    const r = previewLineTotals(li, supplyType);
    taxableValue += r.taxableValue;
    cgst += r.cgst;
    sgst += r.sgst;
    igst += r.igst;
  }

  const preRound = taxableValue + cgst + sgst + igst;
  const rounded = Math.round(preRound);
  const roundOff = rounded - preRound;

  return { subtotal, discountTotal, taxableValue, cgst, sgst, igst, roundOff, total: rounded };
}
