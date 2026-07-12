"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { idSchema } from "@/lib/utils/validation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { postExpenseToJournal } from "@/lib/accounting/postInvoice";
import { money, round2 } from "@/lib/accounting/money";

const TDS_SECTIONS: Record<string, number> = {
  "194C": 1,
  "194H": 5,
  "194I": 10,
  "194J": 10,
  "194Q": 0.1,
  "194R": 10,
};

const expenseSchema = z.object({
  vendorId: idSchema.optional(),
  categoryAccountId: idSchema,
  date: z.string(),
  amount: z.coerce.number().positive(),
  gstRate: z.coerce.number().min(0).max(28).default(0),
  isItcEligible: z.coerce.boolean().default(true),
  isInterState: z.coerce.boolean().default(false),
  tdsApplicable: z.coerce.boolean().default(false),
  tdsSection: z.string().optional(),
  paymentMode: z.enum(["bank", "cash", "upi", "card", "cheque", "other"]).default("bank"),
  bankAccountId: idSchema.optional(),
  description: z.string().optional(),
  status: z.enum(["draft", "recorded", "paid"]).default("recorded"),
});

export async function createExpense(payload: z.infer<typeof expenseSchema>) {
  const parsed = expenseSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  // Amount entered is treated as GST-inclusive; back out the taxable value.
  const gstDivisor = money(1).plus(money(data.gstRate).dividedBy(100));
  const taxableValue = round2(money(data.amount).dividedBy(gstDivisor));
  const totalGst = round2(money(data.amount).minus(taxableValue));

  let cgst = 0, sgst = 0, igst = 0;
  if (data.gstRate > 0) {
    if (data.isInterState) {
      igst = totalGst;
    } else {
      cgst = round2(money(totalGst).dividedBy(2));
      sgst = round2(money(totalGst).minus(cgst));
    }
  }

  const tdsRate = data.tdsApplicable && data.tdsSection ? TDS_SECTIONS[data.tdsSection] ?? 0 : 0;
  const tdsAmount = data.tdsApplicable ? round2(money(taxableValue).times(tdsRate).dividedBy(100)) : 0;

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      tenant_id: tenant.id,
      vendor_id: data.vendorId || null,
      category_account_id: data.categoryAccountId,
      date: data.date,
      amount: data.amount,
      taxable_value: taxableValue,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: igst,
      gst_rate: data.gstRate,
      is_itc_eligible: data.isItcEligible,
      tds_applicable: data.tdsApplicable,
      tds_section: data.tdsSection || null,
      tds_rate: tdsRate,
      tds_amount: tdsAmount,
      payment_mode: data.paymentMode,
      bank_account_id: data.bankAccountId || null,
      description: data.description || null,
      status: data.status,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  if (data.status !== "draft") {
    try {
      await postExpenseToJournal(supabase, tenant.id, expense.id);
    } catch (e) {
      return { error: `Expense saved, but ledger posting failed: ${(e as Error).message}` };
    }
  }

  revalidatePath("/expenses");
  revalidatePath("/dashboard");
  return { success: true };
}

