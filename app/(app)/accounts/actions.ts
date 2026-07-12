"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { idSchema } from "@/lib/utils/validation";

const accountSchema = z.object({
  tenantId: idSchema,
  code: z.string().min(1).max(10),
  name: z.string().min(1).max(200),
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  accountSubtype: z.string().optional(),
  openingBalance: z.coerce.number().default(0),
  gstApplicable: z.coerce.boolean().default(false),
  gstRate: z.coerce.number().optional(),
});

export async function createAccount(formData: FormData) {
  const parsed = accountSchema.safeParse({
    tenantId: formData.get("tenantId"),
    code: formData.get("code"),
    name: formData.get("name"),
    accountType: formData.get("accountType"),
    accountSubtype: formData.get("accountSubtype") || undefined,
    openingBalance: formData.get("openingBalance") || 0,
    gstApplicable: formData.get("gstApplicable") === "on",
    gstRate: formData.get("gstRate") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("accounts").insert({
    tenant_id: parsed.data.tenantId,
    code: parsed.data.code,
    name: parsed.data.name,
    account_type: parsed.data.accountType,
    account_subtype: parsed.data.accountSubtype ?? null,
    opening_balance: parsed.data.openingBalance,
    opening_balance_date: parsed.data.openingBalance ? new Date().toISOString().slice(0, 10) : null,
    gst_applicable: parsed.data.gstApplicable,
    gst_rate: parsed.data.gstRate ?? null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/accounts");
  return { success: true };
}

