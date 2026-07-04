"use client";

import { useState, useTransition } from "react";
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

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateFirmProfile({
        tenantId: tenant.id,
        name: formData.get("name") as string,
        gstin: (formData.get("gstin") as string) || undefined,
        pan: (formData.get("pan") as string) || undefined,
        tan: (formData.get("tan") as string) || undefined,
        addressLine1: (formData.get("addressLine1") as string) || undefined,
        city: (formData.get("city") as string) || undefined,
        state: (formData.get("state") as string) || undefined,
        stateCode: (formData.get("stateCode") as string) || undefined,
        pincode: (formData.get("pincode") as string) || undefined,
      });
      if (result?.error) setError(result.error);
      else setSaved(true);
    });
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Firm Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
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

          {error && (
            <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
          )}
          {saved && !error && (
            <p className="rounded-[var(--radius-md)] bg-positive-100 px-3 py-2 text-xs text-positive-700">
              Saved.
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving…" : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
