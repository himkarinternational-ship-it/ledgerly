"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { calculateInvoiceTotals, determineSupplyType, calculateLineItemGst } from "@/lib/gst/calculator";
import { postInvoiceToJournal } from "@/lib/accounting/postInvoice";
import { getCurrentTenant } from "@/lib/tenant";

const lineItemSchema = z.object({
  description: z.string().min(1),
  hsnSacCode: z.string().optional(),
  quantity: z.coerce.number().positive(),
  unit: z.string().optional(),
  rate: z.coerce.number().nonnegative(),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  gstRate: z.coerce.number().min(0).max(28).default(0),
});

const invoiceSchema = z.object({
  tenantId: z.string().uuid(),
  invoiceType: z.enum(["tax_invoice", "bill_of_supply", "export", "proforma", "credit_note", "debit_note"]),
  clientId: z.string().uuid(),
  issueDate: z.string(),
  dueDate: z.string().optional(),
  placeOfSupplyState: z.string(),
  placeOfSupplyStateCode: z.string(),
  notes: z.string().optional(),
  paymentTerms: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1),
  status: z.enum(["draft", "sent"]).default("draft"),
});

export type InvoiceFormPayload = z.infer<typeof invoiceSchema>;

export async function createInvoice(payload: InvoiceFormPayload) {
  const parsed = invoiceSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: tenantRow } = await supabase
    .from("tenants")
    .select("state_code")
    .eq("id", tenant.id)
    .single();

  const supplyType =
    data.invoiceType === "export"
      ? "export"
      : determineSupplyType(tenantRow?.state_code, data.placeOfSupplyStateCode);

  const totals = calculateInvoiceTotals(
    data.lineItems.map((li) => ({
      quantity: li.quantity,
      rate: li.rate,
      discountPercent: li.discountPercent,
      gstRate: li.gstRate,
    })),
    supplyType
  );

  const invoiceNumber = await generateInvoiceNumber(supabase, tenant.id, data.invoiceType);

  const { data: invoice, error: invErr } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenant.id,
      invoice_number: invoiceNumber,
      invoice_type: data.invoiceType,
      client_id: data.clientId,
      issue_date: data.issueDate,
      due_date: data.dueDate || null,
      place_of_supply_state: data.placeOfSupplyState,
      place_of_supply_state_code: data.placeOfSupplyStateCode,
      supply_type: supplyType,
      subtotal: totals.subtotal,
      discount_total: totals.discountTotal,
      taxable_value: totals.taxableValue,
      cgst_amount: totals.cgstAmount,
      sgst_amount: totals.sgstAmount,
      igst_amount: totals.igstAmount,
      round_off: totals.roundOff,
      total_amount: totals.totalAmount,
      status: data.status,
      notes: data.notes || null,
      payment_terms: data.paymentTerms || null,
    })
    .select()
    .single();

  if (invErr) return { error: invErr.message };

  const itemRows = data.lineItems.map((li, idx) => {
    const lineResult = calculateLineItemGst(li, supplyType);
    return {
      invoice_id: invoice.id,
      description: li.description,
      hsn_sac_code: li.hsnSacCode || null,
      quantity: li.quantity,
      unit: li.unit || "unit",
      rate: li.rate,
      discount_percent: li.discountPercent,
      discount_amount: (li.quantity * li.rate * li.discountPercent) / 100,
      taxable_value: lineResult.taxableValue,
      gst_rate: li.gstRate,
      cgst_amount: lineResult.cgstAmount,
      sgst_amount: lineResult.sgstAmount,
      igst_amount: lineResult.igstAmount,
      total_amount: lineResult.totalAmount,
      sort_order: idx,
    };
  });

  const { error: itemsErr } = await supabase.from("invoice_items").insert(itemRows);
  if (itemsErr) return { error: itemsErr.message };

  // Only post to the ledger once the invoice is finalized (not draft)
  if (data.status !== "draft") {
    try {
      await postInvoiceToJournal(supabase, tenant.id, invoice.id);
    } catch (e) {
      return { error: `Invoice saved, but ledger posting failed: ${(e as Error).message}` };
    }
  }

  revalidatePath("/invoices");
  revalidatePath("/dashboard");
  return { success: true, invoiceId: invoice.id };
}

async function generateInvoiceNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  invoiceType: string
): Promise<string> {
  const prefix = invoiceType === "credit_note" ? "CN" : invoiceType === "debit_note" ? "DN" : invoiceType === "export" ? "EXP" : invoiceType === "proforma" ? "PF" : "INV";
  const fyStart = new Date().getMonth() + 1 >= 4 ? new Date().getFullYear() : new Date().getFullYear() - 1;
  const fyLabel = `${fyStart}-${String((fyStart + 1) % 100).padStart(2, "0")}`;

  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("invoice_type", invoiceType)
    .like("invoice_number", `${prefix}-${fyLabel}-%`);

  const seq = (count ?? 0) + 1;
  return `${prefix}-${fyLabel}-${String(seq).padStart(4, "0")}`;
}

export async function finalizeAndRedirect(payload: InvoiceFormPayload) {
  const result = await createInvoice(payload);
  if (result.success && result.invoiceId) {
    redirect(`/invoices/${result.invoiceId}`);
  }
  return result;
}
