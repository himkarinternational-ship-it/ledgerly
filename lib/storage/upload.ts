import { createServiceClient } from "@/lib/supabase/server";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export class InvalidImageUploadError extends Error {}

/**
 * Uploads a logo or signature image to the public `brand-assets` bucket
 * and returns its public URL. Uses the service role client so it bypasses
 * storage RLS — callers MUST verify the requesting user belongs to the
 * tenant before calling this (see updateFirmProfile, which checks via
 * getCurrentTenant()/createClient() before ever reaching this function).
 */
export async function uploadBrandAsset(
  tenantId: string,
  kind: "logo" | "signature",
  file: File
): Promise<string> {
  if (file.size === 0) {
    throw new InvalidImageUploadError("Empty file.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new InvalidImageUploadError("Image must be under 2MB.");
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new InvalidImageUploadError("Image must be PNG, JPEG, WEBP, or SVG.");
  }

  const supabase = createServiceClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${tenantId}/${kind}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("brand-assets")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  const { data: publicUrlData } = supabase.storage.from("brand-assets").getPublicUrl(path);
  return publicUrlData.publicUrl;
}
