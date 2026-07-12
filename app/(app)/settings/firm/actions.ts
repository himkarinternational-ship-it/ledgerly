"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isValidGstinFormat } from "@/lib/gst/calculator";
import { idSchema } from "@/lib/utils/validation";
import { uploadBrandAsset, InvalidImageUploadError } from "@/lib/storage/upload";
import { getCurrentTenant } from "@/lib/tenant";

const firmSchema = z.object({
  tenantId: idSchema,
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

export async function updateFirmProfile(formData: FormData) {
  const parsed = firmSchema.safeParse({
    tenantId: formData.get("tenantId"),
    name: formData.get("name"),
    gstin: (formData.get("gstin") as string) || undefined,
    pan: (formData.get("pan") as string) || undefined,
    tan: (formData.get("tan") as string) || undefined,
    addressLine1: (formData.get("addressLine1") as string) || undefined,
    city: (formData.get("city") as string) || undefined,
    state: (formData.get("state") as string) || undefined,
    stateCode: (formData.get("stateCode") as string) || undefined,
    pincode: (formData.get("pincode") as string) || undefined,
  });

  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  if (data.gstin && !isValidGstinFormat(data.gstin)) {
    return { error: "GSTIN format looks invalid. Expected 15 characters, e.g. 08ABCDE1234F1Z5." };
  }

  // Confirms the requester actually belongs to this tenant before we touch
  // storage or the tenants row (uploadBrandAsset itself uses the service
  // role and does not re-check membership, so this check is load-bearing).
  const currentTenant = await getCurrentTenant();
  if (currentTenant.id !== data.tenantId) {
    return { error: "You don't have permission to edit this firm's profile." };
  }

  const updates: Record<string, unknown> = {
    name: data.name,
    gstin: data.gstin?.toUpperCase() || null,
    pan: data.pan?.toUpperCase() || null,
    tan: data.tan?.toUpperCase() || null,
    address_line1: data.addressLine1 || null,
    city: data.city || null,
    state: data.state || null,
    state_code: data.stateCode || null,
    pincode: data.pincode || null,
  };

  const logoFile = formData.get("logo");
  const signatureFile = formData.get("signature");

  try {
    if (logoFile instanceof File && logoFile.size > 0) {
      updates.logo_url = await uploadBrandAsset(data.tenantId, "logo", logoFile);
    }
    if (signatureFile instanceof File && signatureFile.size > 0) {
      updates.signature_url = await uploadBrandAsset(data.tenantId, "signature", signatureFile);
    }
  } catch (e) {
    if (e instanceof InvalidImageUploadError) return { error: e.message };
    return { error: `Image upload failed: ${(e as Error).message}` };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tenants").update(updates).eq("id", data.tenantId);

  if (error) return { error: error.message };

  revalidatePath("/settings/firm");
  revalidatePath("/invoices");
  return { success: true };
}
