"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

const bankAccountSchema = z.object({
  bankName: z.string().min(1),
  accountNumber: z.string().min(1),
  ifscCode: z.string().min(1),
  branch: z.string().optional(),
  accountType: z.enum(["current", "savings", "overdraft", "cash_credit"]).default("current"),
  openingBalance: z.coerce.number().default(0),
  isPrimary: z.coerce.boolean().default(false),
});

export async function createBankAccount(payload: z.infer<typeof bankAccountSchema>) {
  const parsed = bankAccountSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  const data = parsed.data;

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  // Create a linked ledger account so this bank account participates in the
  // double-entry books (journal lines need a real accounts.id to post against).
  const { count } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .like("code", "10%")
    .neq("code", "1000");
  const nextCode = 1011 + (count ?? 0);

  const { data: ledgerAccount, error: ledgerErr } = await supabase
    .from("accounts")
    .insert({
      tenant_id: tenant.id,
      code: String(nextCode),
      name: `Bank — ${data.bankName} (${data.accountNumber.slice(-4)})`,
      account_type: "asset",
      account_subtype: "bank",
      is_bank_account: true,
      opening_balance: data.openingBalance,
      opening_balance_date: data.openingBalance ? new Date().toISOString().slice(0, 10) : null,
    })
    .select()
    .single();
  if (ledgerErr) return { error: ledgerErr.message };

  if (data.isPrimary) {
    await supabase.from("bank_accounts").update({ is_primary: false }).eq("tenant_id", tenant.id);
  }

  const { error } = await supabase.from("bank_accounts").insert({
    tenant_id: tenant.id,
    account_id: ledgerAccount.id,
    bank_name: data.bankName,
    account_number: data.accountNumber,
    ifsc_code: data.ifscCode,
    branch: data.branch || null,
    account_type: data.accountType,
    opening_balance: data.openingBalance,
    current_balance: data.openingBalance,
    is_primary: data.isPrimary,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/bank-accounts");
  revalidatePath("/invoices/new");
  revalidatePath("/accounts");
  return { success: true };
}
