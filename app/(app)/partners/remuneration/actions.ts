"use server";

import { z } from "zod";
import { idSchema } from "@/lib/utils/validation";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  tenantId: idSchema,
  financialYear: z.string().min(1),
  netProfitAsPerPL: z.number(),
  addBackRemuneration: z.number(),
  addBackPartnerInterest: z.number(),
  addBackDisallowedExpenses: z.number(),
  bookProfit: z.number(),
  maxAllowableRemuneration: z.number(),
  breakdown: z.array(z.object({ step: z.string(), amount: z.number() })),
});

export async function saveRemunerationCalculation(payload: z.infer<typeof schema>) {
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return { error: "Invalid input" };
  const data = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("remuneration_calculations").upsert(
    {
      tenant_id: data.tenantId,
      financial_year: data.financialYear,
      net_profit_as_per_pl: data.netProfitAsPerPL,
      add_back_remuneration: data.addBackRemuneration,
      add_back_partner_interest: data.addBackPartnerInterest,
      add_back_disallowed_expenses: data.addBackDisallowedExpenses,
      book_profit: data.bookProfit,
      max_allowable_remuneration: data.maxAllowableRemuneration,
      calculation_breakdown: data.breakdown,
    },
    { onConflict: "tenant_id,financial_year" }
  );

  if (error) return { error: error.message };
  return { success: true };
}

