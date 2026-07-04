"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createAccount } from "@/app/(app)/accounts/actions";

export function NewAccountButton({ tenantId }: { tenantId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createAccount(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setOpen(false);
      }
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> New Account
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-paper-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h3 className="font-display text-base font-medium">New Account</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4 px-5 py-4">
              <input type="hidden" name="tenantId" value={tenantId} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="code">Code</Label>
                  <Input id="code" name="code" placeholder="5910" required />
                </div>
                <div>
                  <Label htmlFor="accountType">Type</Label>
                  <Select id="accountType" name="accountType" required defaultValue="expense">
                    <option value="asset">Asset</option>
                    <option value="liability">Liability</option>
                    <option value="equity">Equity</option>
                    <option value="income">Income</option>
                    <option value="expense">Expense</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="name">Account Name</Label>
                <Input id="name" name="name" placeholder="e.g. Courier & Freight" required />
              </div>
              <div>
                <Label htmlFor="accountSubtype">Subtype (optional)</Label>
                <Input id="accountSubtype" name="accountSubtype" placeholder="operating_expense" />
              </div>
              <div>
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue="0" />
              </div>

              {error && (
                <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Create Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
