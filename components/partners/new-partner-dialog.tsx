"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createPartner } from "@/app/(app)/partners/actions";

export function NewPartnerButton({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createPartner({
        name: formData.get("name") as string,
        pan: (formData.get("pan") as string) || undefined,
        isWorkingPartner: formData.get("isWorkingPartner") === "on",
        profitSharePercent: Number(formData.get("profitSharePercent")),
        interestOnCapitalRate: Number(formData.get("interestOnCapitalRate") || 12),
        openingCapital: Number(formData.get("openingCapital") || 0),
      });
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add Partner
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" data-tenant={tenantId}>
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-paper-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h3 className="font-display text-base font-medium">Add Partner</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4 px-5 py-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="pan">PAN</Label>
                  <Input id="pan" name="pan" placeholder="ABCDE1234F" />
                </div>
                <div>
                  <Label htmlFor="profitSharePercent">Profit Share %</Label>
                  <Input id="profitSharePercent" name="profitSharePercent" type="number" step="0.01" min="0" max="100" required />
                </div>
              </div>
              <div>
                <Label htmlFor="interestOnCapitalRate">Interest on Capital (% p.a.)</Label>
                <Input id="interestOnCapitalRate" name="interestOnCapitalRate" type="number" step="0.01" defaultValue="12" />
              </div>
              <div>
                <Label htmlFor="openingCapital">Opening Capital Balance</Label>
                <Input id="openingCapital" name="openingCapital" type="number" step="0.01" defaultValue="0" />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" name="isWorkingPartner" defaultChecked className="rounded border-rule-strong" />
                Working partner (eligible for remuneration under the deed)
              </label>

              {error && (
                <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Add Partner"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
