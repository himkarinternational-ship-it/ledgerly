"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { GST_STATE_CODES } from "@/lib/gst/calculator";
import { updateFirmProfile } from "@/app/(app)/settings/firm/actions";
import type { Tenant } from "@/lib/supabase/types";

export function FirmProfileForm({ tenant }: { tenant: Tenant }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(tenant.logo_url);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(tenant.signature_url);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateFirmProfile(formData);
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>, setPreview: (url: string | null) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Firm Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-5">
          <input type="hidden" name="tenantId" value={tenant.id} />

          <div>
            <Label htmlFor="name">Firm Name</Label>
            <Input id="name" name="name" defaultValue={tenant.name} required />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="gstin">GSTIN</Label>
              <Input id="gstin" name="gstin" defaultValue={tenant.gstin ?? ""} placeholder="08ABCDE1234F1Z5" />
            </div>
            <div>
              <Label htmlFor="pan">PAN</Label>
              <Input id="pan" name="pan" defaultValue={tenant.pan ?? ""} placeholder="ABCDE1234F" />
            </div>
            <div>
              <Label htmlFor="tan">TAN</Label>
              <Input id="tan" name="tan" defaultValue={tenant.tan ?? ""} placeholder="RTKJ01234A" />
            </div>
          </div>

          <div>
            <Label htmlFor="addressLine1">Address</Label>
            <Input id="addressLine1" name="addressLine1" defaultValue={tenant.address_line1 ?? ""} />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={tenant.city ?? ""} />
            </div>
            <div>
              <Label htmlFor="stateCode">State</Label>
              <Select
                id="stateCode"
                name="stateCode"
                defaultValue={tenant.state_code ?? ""}
                onChange={(e) => {
                  const nameInput = document.getElementById("state") as HTMLInputElement | null;
                  if (nameInput) nameInput.value = GST_STATE_CODES[e.target.value] ?? "";
                }}
              >
                <option value="">Select…</option>
                {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </Select>
              <input type="hidden" id="state" name="state" defaultValue={tenant.state ?? ""} />
            </div>
            <div>
              <Label htmlFor="pincode">PIN Code</Label>
              <Input id="pincode" name="pincode" defaultValue={tenant.pincode ?? ""} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-rule pt-4">
            <div>
              <Label htmlFor="logo">Company Logo</Label>
              {logoPreview && (
                <div className="mb-2 flex h-16 w-32 items-center justify-center rounded-[var(--radius-md)] border border-rule bg-ink-50 p-2">
                  <Image src={logoPreview} alt="Logo preview" width={112} height={48} className="max-h-full max-w-full object-contain" unoptimized />
                </div>
              )}
              <input
                id="logo"
                name="logo"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => handleImagePick(e, setLogoPreview)}
                className="w-full text-xs text-ink-500 file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-200"
              />
              <p className="mt-1 text-[11px] text-ink-400">PNG, JPEG, WEBP or SVG, up to 2MB.</p>
            </div>
            <div>
              <Label htmlFor="signature">Authorized Signature</Label>
              {signaturePreview && (
                <div className="mb-2 flex h-16 w-32 items-center justify-center rounded-[var(--radius-md)] border border-rule bg-ink-50 p-2">
                  <Image src={signaturePreview} alt="Signature preview" width={112} height={48} className="max-h-full max-w-full object-contain" unoptimized />
                </div>
              )}
              <input
                id="signature"
                name="signature"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={(e) => handleImagePick(e, setSignaturePreview)}
                className="w-full text-xs text-ink-500 file:mr-3 file:rounded-[var(--radius-sm)] file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-700 hover:file:bg-ink-200"
              />
              <p className="mt-1 text-[11px] text-ink-400">A scanned or photographed signature on a plain background works best.</p>
            </div>
          </div>

          {error && (
            <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
          )}
          {saved && !error && (
            <p className="rounded-[var(--radius-md)] bg-positive-100 px-3 py-2 text-xs text-positive-700">Saved.</p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
