"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { GST_STATE_CODES } from "@/lib/gst/calculator";
import { createContact } from "@/app/(app)/settings/clients/actions";

export function NewContactButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createContact({
        contactType: formData.get("contactType") as "client" | "vendor" | "both",
        name: formData.get("name") as string,
        email: (formData.get("email") as string) || "",
        phone: (formData.get("phone") as string) || undefined,
        gstin: (formData.get("gstin") as string) || undefined,
        pan: (formData.get("pan") as string) || undefined,
        billingAddressLine1: (formData.get("billingAddressLine1") as string) || undefined,
        billingCity: (formData.get("billingCity") as string) || undefined,
        billingStateCode: (formData.get("billingStateCode") as string) || undefined,
        billingPincode: (formData.get("billingPincode") as string) || undefined,
        paymentTermsDays: Number(formData.get("paymentTermsDays") || 30),
      });
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> New Contact
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-lg rounded-[var(--radius-lg)] bg-paper-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h3 className="font-display text-base font-medium">New Contact</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" name="name" required />
                </div>
                <div>
                  <Label htmlFor="contactType">Type</Label>
                  <Select id="contactType" name="contactType" defaultValue="client">
                    <option value="client">Client</option>
                    <option value="vendor">Vendor</option>
                    <option value="both">Both</option>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" type="email" />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gstin">GSTIN (if registered)</Label>
                  <Input id="gstin" name="gstin" placeholder="08ABCDE1234F1Z5" />
                </div>
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input id="pan" name="pan" />
                </div>
              </div>

              <div>
                <Label htmlFor="billingAddressLine1">Billing Address</Label>
                <Input id="billingAddressLine1" name="billingAddressLine1" />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="billingCity">City</Label>
                  <Input id="billingCity" name="billingCity" />
                </div>
                <div>
                  <Label htmlFor="billingStateCode">State</Label>
                  <Select id="billingStateCode" name="billingStateCode">
                    <option value="">Select…</option>
                    {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="billingPincode">PIN Code</Label>
                  <Input id="billingPincode" name="billingPincode" />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentTermsDays">Payment Terms (days)</Label>
                <Input id="paymentTermsDays" name="paymentTermsDays" type="number" defaultValue="30" className="w-32" />
              </div>

              {error && (
                <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Add Contact"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
