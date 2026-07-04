"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { isValidGstinFormat, gstinStateCode, GST_STATE_CODES } from "@/lib/gst/calculator";

const contactSchema = z.object({
  contactType: z.enum(["client", "vendor", "both"]),
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  billingAddressLine1: z.string().optional(),
  billingCity: z.string().optional(),
  billingStateCode: z.string().optional(),
  paymentTermsDays: z.coerce.number().default(30),
});

export async function createContact(payload: z.infer<typeof contactSchema>) {
  const parsed = contactSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues.map((i) => i.message).join(", ") };
  const data = parsed.data;

  if (data.gstin && !isValidGstinFormat(data.gstin)) {
    return { error: "GSTIN format looks invalid." };
  }

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const stateCode = data.gstin ? gstinStateCode(data.gstin) : data.billingStateCode;

  const { error } = await supabase.from("contacts").insert({
    tenant_id: tenant.id,
    contact_type: data.contactType,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    gstin: data.gstin?.toUpperCase() || null,
    pan: data.pan?.toUpperCase() || null,
    is_registered_gst: Boolean(data.gstin),
    billing_address_line1: data.billingAddressLine1 || null,
    billing_city: data.billingCity || null,
    billing_state_code: stateCode || null,
    billing_state: stateCode ? GST_STATE_CODES[stateCode] : null,
    payment_terms_days: data.paymentTermsDays,
  });

  if (error) return { error: error.message };

  revalidatePath("/settings/clients");
  revalidatePath("/invoices/new");
  return { success: true };
}
