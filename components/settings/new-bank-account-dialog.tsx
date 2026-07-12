"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createBankAccount } from "@/app/(app)/settings/bank-accounts/actions";

export function NewBankAccountButton() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createBankAccount({
        bankName: formData.get("bankName") as string,
        accountNumber: formData.get("accountNumber") as string,
        ifscCode: formData.get("ifscCode") as string,
        branch: (formData.get("branch") as string) || undefined,
        accountType: formData.get("accountType") as "current" | "savings" | "overdraft" | "cash_credit",
        openingBalance: Number(formData.get("openingBalance") || 0),
        isPrimary: formData.get("isPrimary") === "on",
      });
      if (result?.error) setError(result.error);
      else setOpen(false);
    });
  }

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Plus size={15} /> Add Bank Account
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
          <div className="w-full max-w-md rounded-[var(--radius-lg)] bg-paper-raised shadow-xl">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h3 className="font-display text-base font-medium">Add Bank Account</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4 px-5 py-4">
              <div>
                <Label htmlFor="bankName">Bank Name</Label>
                <Input id="bankName" name="bankName" placeholder="Axis Bank" required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="accountNumber">Account Number</Label>
                  <Input id="accountNumber" name="accountNumber" required />
                </div>
                <div>
                  <Label htmlFor="ifscCode">IFSC Code</Label>
                  <Input id="ifscCode" name="ifscCode" placeholder="UTIB0002114" required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="branch">Branch</Label>
                  <Input id="branch" name="branch" />
                </div>
                <div>
                  <Label htmlFor="accountType">Account Type</Label>
                  <Select id="accountType" name="accountType" defaultValue="current">
                    <option value="current">Current</option>
                    <option value="savings">Savings</option>
                    <option value="overdraft">Overdraft</option>
                    <option value="cash_credit">Cash Credit</option>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="openingBalance">Opening Balance</Label>
                <Input id="openingBalance" name="openingBalance" type="number" step="0.01" defaultValue="0" />
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-600">
                <input type="checkbox" name="isPrimary" className="rounded border-rule-strong" />
                Set as primary account (shown by default on invoices)
              </label>

              {error && (
                <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Add Account"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
