import type { SupabaseClient } from "@supabase/supabase-js";
import { money, round2 } from "@/lib/accounting/money";

/** period format: "MM-YYYY", e.g. "06-2026" */
function periodToDateRange(period: string): { from: string; to: string } {
  const [mm, yyyy] = period.split("-");
  const from = `${yyyy}-${mm}-01`;
  const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
  const to = `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  return { from, to };
}

export interface Gstr1B2BInvoice {
  invoiceNumber: string;
  invoiceDate: string;
  clientGstin: string;
  clientName: string;
  placeOfSupply: string;
  invoiceValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  rate: number;
}

export interface Gstr1B2CSummary {
  stateCode: string;
  stateName: string;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Gstr1HsnSummary {
  hsnCode: string;
  description: string;
  totalQuantity: number;
  totalValue: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
}

export interface Gstr1Result {
  period: string;
  b2b: Gstr1B2BInvoice[];
  b2cSummary: Gstr1B2CSummary[];
  exports: Gstr1B2BInvoice[];
  creditDebitNotes: Gstr1B2BInvoice[];
  hsnSummary: Gstr1HsnSummary[];
  totals: {
    totalInvoices: number;
    totalTaxableValue: number;
    totalCgst: number;
    totalSgst: number;
    totalIgst: number;
    totalInvoiceValue: number;
  };
}

/**
 * Computes GSTR-1 (outward supplies) for a given month by reading finalized
 * (non-draft, non-cancelled) invoices in that period, split into B2B
 * (invoice-wise, has GSTIN), B2C (state-wise aggregate, no GSTIN), exports,
 * and credit/debit notes — matching the GSTN return structure.
 */
export async function computeGstr1(
  supabase: SupabaseClient,
  tenantId: string,
  period: string
): Promise<Gstr1Result> {
  const { from, to } = periodToDateRange(period);

  const { data: invoices, error } = await supabase
    .from("invoices")
    .select(`
      id, invoice_number, invoice_type, issue_date, taxable_value,
      cgst_amount, sgst_amount, igst_amount, total_amount,
      place_of_supply_state, place_of_supply_state_code, supply_type,
      client_id, contacts:client_id ( name, gstin, is_registered_gst, billing_state_code, billing_state ),
      invoice_items ( hsn_sac_code, description, quantity, taxable_value, cgst_amount, sgst_amount, igst_amount, total_amount, gst_rate )
    `)
    .eq("tenant_id", tenantId)
    .gte("issue_date", from)
    .lte("issue_date", to)
    .not("status", "in", "(draft,cancelled)");

  if (error) throw error;

  const b2b: Gstr1B2BInvoice[] = [];
  const b2cMap = new Map<string, Gstr1B2CSummary>();
  const exports: Gstr1B2BInvoice[] = [];
  const creditDebitNotes: Gstr1B2BInvoice[] = [];
  const hsnMap = new Map<string, Gstr1HsnSummary>();

  let totalTaxableValue = money(0);
  let totalCgst = money(0);
  let totalSgst = money(0);
  let totalIgst = money(0);
  let totalInvoiceValue = money(0);

  for (const inv of invoices ?? []) {
    // Supabase relation typing loosened here deliberately — shape confirmed by the select() above
    const contact = (inv as unknown as { contacts?: { name: string; gstin: string; is_registered_gst: boolean; billing_state_code: string; billing_state: string } }).contacts;
    const items = (inv as unknown as { invoice_items?: Array<{ hsn_sac_code: string; description: string; quantity: number; taxable_value: number; cgst_amount: number; sgst_amount: number; igst_amount: number; total_amount: number; gst_rate: number }> }).invoice_items ?? [];

    const row: Gstr1B2BInvoice = {
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.issue_date,
      clientGstin: contact?.gstin ?? "",
      clientName: contact?.name ?? "Unknown",
      placeOfSupply: `${inv.place_of_supply_state_code ?? ""} - ${inv.place_of_supply_state ?? ""}`,
      invoiceValue: inv.total_amount,
      taxableValue: inv.taxable_value,
      cgst: inv.cgst_amount,
      sgst: inv.sgst_amount,
      igst: inv.igst_amount,
      rate: inv.taxable_value > 0 ? round2(money(inv.cgst_amount).plus(inv.sgst_amount).plus(inv.igst_amount).dividedBy(inv.taxable_value).times(100)) : 0,
    };

    totalTaxableValue = totalTaxableValue.plus(inv.taxable_value);
    totalCgst = totalCgst.plus(inv.cgst_amount);
    totalSgst = totalSgst.plus(inv.sgst_amount);
    totalIgst = totalIgst.plus(inv.igst_amount);
    totalInvoiceValue = totalInvoiceValue.plus(inv.total_amount);

    if (inv.invoice_type === "credit_note" || inv.invoice_type === "debit_note") {
      creditDebitNotes.push(row);
    } else if (inv.invoice_type === "export") {
      exports.push(row);
    } else if (contact?.is_registered_gst && contact?.gstin) {
      b2b.push(row);
    } else {
      const stateCode = inv.place_of_supply_state_code ?? "unknown";
      const existing = b2cMap.get(stateCode) ?? {
        stateCode,
        stateName: inv.place_of_supply_state ?? "Unknown",
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      existing.taxableValue = round2(money(existing.taxableValue).plus(inv.taxable_value));
      existing.cgst = round2(money(existing.cgst).plus(inv.cgst_amount));
      existing.sgst = round2(money(existing.sgst).plus(inv.sgst_amount));
      existing.igst = round2(money(existing.igst).plus(inv.igst_amount));
      b2cMap.set(stateCode, existing);
    }

    for (const item of items) {
      const hsn = item.hsn_sac_code || "UNSPECIFIED";
      const existing = hsnMap.get(hsn) ?? {
        hsnCode: hsn,
        description: item.description,
        totalQuantity: 0,
        totalValue: 0,
        taxableValue: 0,
        cgst: 0,
        sgst: 0,
        igst: 0,
      };
      existing.totalQuantity = round2(money(existing.totalQuantity).plus(item.quantity));
      existing.totalValue = round2(money(existing.totalValue).plus(item.total_amount));
      existing.taxableValue = round2(money(existing.taxableValue).plus(item.taxable_value));
      existing.cgst = round2(money(existing.cgst).plus(item.cgst_amount));
      existing.sgst = round2(money(existing.sgst).plus(item.sgst_amount));
      existing.igst = round2(money(existing.igst).plus(item.igst_amount));
      hsnMap.set(hsn, existing);
    }
  }

  return {
    period,
    b2b,
    b2cSummary: Array.from(b2cMap.values()),
    exports,
    creditDebitNotes,
    hsnSummary: Array.from(hsnMap.values()),
    totals: {
      totalInvoices: (invoices ?? []).length,
      totalTaxableValue: round2(totalTaxableValue),
      totalCgst: round2(totalCgst),
      totalSgst: round2(totalSgst),
      totalIgst: round2(totalIgst),
      totalInvoiceValue: round2(totalInvoiceValue),
    },
  };
}

export interface Gstr3bResult {
  period: string;
  outwardTaxableSupplies: { taxableValue: number; igst: number; cgst: number; sgst: number; cess: number };
  eligibleItc: { igst: number; cgst: number; sgst: number; cess: number };
  itcFromExpenses: { igst: number; cgst: number; sgst: number };
  netTaxPayable: { igst: number; cgst: number; sgst: number; cess: number; total: number };
}

/**
 * Computes GSTR-3B (summary return): output tax liability from sales,
 * less input tax credit from ITC-eligible expenses in the same period.
 * This gives the net cash tax payable for the month.
 */
export async function computeGstr3b(
  supabase: SupabaseClient,
  tenantId: string,
  period: string
): Promise<Gstr3bResult> {
  const { from, to } = periodToDateRange(period);

  const { data: invoices, error: invErr } = await supabase
    .from("invoices")
    .select("taxable_value, cgst_amount, sgst_amount, igst_amount, cess_amount, invoice_type")
    .eq("tenant_id", tenantId)
    .gte("issue_date", from)
    .lte("issue_date", to)
    .not("status", "in", "(draft,cancelled)");
  if (invErr) throw invErr;

  let outTaxable = money(0), outCgst = money(0), outSgst = money(0), outIgst = money(0), outCess = money(0);
  for (const inv of invoices ?? []) {
    const sign = inv.invoice_type === "credit_note" ? -1 : 1;
    outTaxable = outTaxable.plus(money(inv.taxable_value).times(sign));
    outCgst = outCgst.plus(money(inv.cgst_amount).times(sign));
    outSgst = outSgst.plus(money(inv.sgst_amount).times(sign));
    outIgst = outIgst.plus(money(inv.igst_amount).times(sign));
    outCess = outCess.plus(money(inv.cess_amount ?? 0).times(sign));
  }

  const { data: expenses, error: expErr } = await supabase
    .from("expenses")
    .select("cgst_amount, sgst_amount, igst_amount, is_itc_eligible")
    .eq("tenant_id", tenantId)
    .gte("date", from)
    .lte("date", to)
    .eq("is_itc_eligible", true);
  if (expErr) throw expErr;

  let itcCgst = money(0), itcSgst = money(0), itcIgst = money(0);
  for (const exp of expenses ?? []) {
    itcCgst = itcCgst.plus(exp.cgst_amount ?? 0);
    itcSgst = itcSgst.plus(exp.sgst_amount ?? 0);
    itcIgst = itcIgst.plus(exp.igst_amount ?? 0);
  }

  const netCgst = round2(money(outCgst).minus(itcCgst).clampedTo(0, Infinity));
  const netSgst = round2(money(outSgst).minus(itcSgst).clampedTo(0, Infinity));
  const netIgst = round2(money(outIgst).minus(itcIgst).clampedTo(0, Infinity));
  const netCess = round2(outCess);

  return {
    period,
    outwardTaxableSupplies: {
      taxableValue: round2(outTaxable),
      igst: round2(outIgst),
      cgst: round2(outCgst),
      sgst: round2(outSgst),
      cess: round2(outCess),
    },
    eligibleItc: {
      igst: round2(itcIgst),
      cgst: round2(itcCgst),
      sgst: round2(itcSgst),
      cess: 0,
    },
    itcFromExpenses: {
      igst: round2(itcIgst),
      cgst: round2(itcCgst),
      sgst: round2(itcSgst),
    },
    netTaxPayable: {
      igst: netIgst,
      cgst: netCgst,
      sgst: netSgst,
      cess: netCess,
      total: round2(money(netIgst).plus(netCgst).plus(netSgst).plus(netCess)),
    },
  };
}
