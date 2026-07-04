"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidGstinFormat } from "@/lib/gst/calculator";

const firmSchema = z.object({
  tenantId: z.string().uuid(),
  name: z.string().min(1),
  gstin: z.string().optional(),
  pan: z.string().optional(),
  tan: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  stateCode: z.string().optional(),
  pincode: z.string().optional(),
});

export async function updateFirmProfile(payload: z.infer<typeof firmSchema>) {
  const parsed = firmSchema.safeParse(payload);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  if (data.gstin && !isValidGstinFormat(data.gstin)) {
    return { error: "GSTIN format looks invalid. Expected 15 characters, e.g. 08ABCDE1234F1Z5." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tenants")
    .update({
      name: data.name,
      gstin: data.gstin?.toUpperCase() || null,
      pan: data.pan?.toUpperCase() || null,
      tan: data.tan?.toUpperCase() || null,
      address_line1: data.addressLine1 || null,
      city: data.city || null,
      state: data.state || null,
      state_code: data.stateCode || null,
      pincode: data.pincode || null,
    })
    .eq("id", data.tenantId);

  if (error) return { error: error.message };

  revalidatePath("/settings/firm");
  return { success: true };
}
