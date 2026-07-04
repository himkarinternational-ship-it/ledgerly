"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

const partnerSchema = z.object({
  name: z.string().min(1),
  pan: z.string().optional(),
  isWorkingPartner: z.coerce.boolean().default(true),
  profitSharePercent: z.coerce.number().min(0).max(100),
  interestOnCapitalRate: z.coerce.number().min(0).max(100).default(12),
  openingCapital: z.coerce.number().default(0),
});

export async function createPartner(payload: z.infer<typeof partnerSchema>) {
  const parsed = partnerSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  // Create individual capital + current ledger accounts for this partner
  const { count: acctCount } = await supabase
    .from("accounts")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .like("code", "31%");
  const baseCode = 3100 + ((acctCount ?? 0) * 10);

  const { data: capitalAccount, error: capErr } = await supabase
    .from("accounts")
    .insert({
      tenant_id: tenant.id,
      code: String(baseCode + 1),
      name: `Partner Capital — ${data.name}`,
      account_type: "equity",
      account_subtype: "partner_capital",
      opening_balance: data.openingCapital,
      opening_balance_date: data.openingCapital ? new Date().toISOString().slice(0, 10) : null,
    })
    .select()
    .single();
  if (capErr) return { error: capErr.message };

  const { data: currentAccount, error: curErr } = await supabase
    .from("accounts")
    .insert({
      tenant_id: tenant.id,
      code: String(baseCode + 2),
      name: `Partner Current — ${data.name}`,
      account_type: "equity",
      account_subtype: "partner_current",
    })
    .select()
    .single();
  if (curErr) return { error: curErr.message };

  const { error: partnerErr } = await supabase.from("partners").insert({
    tenant_id: tenant.id,
    name: data.name,
    pan: data.pan || null,
    is_working_partner: data.isWorkingPartner,
    profit_share_percent: data.profitSharePercent,
    interest_on_capital_rate: data.interestOnCapitalRate,
    capital_account_id: capitalAccount.id,
    current_account_id: currentAccount.id,
    joined_date: new Date().toISOString().slice(0, 10),
  });
  if (partnerErr) return { error: partnerErr.message };

  revalidatePath("/partners");
  revalidatePath("/accounts");
  return { success: true };
}
