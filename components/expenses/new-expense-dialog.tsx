"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { createExpense } from "@/app/(app)/expenses/actions";

interface AccountOption {
  id: string;
  code: string;
  name: string;
}
interface VendorOption {
  id: string;
  name: string;
}

const TDS_SECTIONS = [
  { code: "194C", label: "194C — Contractor payment (1%/2%)" },
  { code: "194H", label: "194H — Commission/brokerage (5%)" },
  { code: "194I", label: "194I — Rent (10%)" },
  { code: "194J", label: "194J — Professional/technical fees (10%)" },
  { code: "194Q", label: "194Q — Purchase of goods (0.1%)" },
  { code: "194R", label: "194R — Benefits/perquisites (10%)" },
];

export function NewExpenseButton({
  expenseAccounts,
  vendors,
}: {
  expenseAccounts: AccountOption[];
  vendors: VendorOption[];
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [gstRate, setGstRate] = useState(0);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await createExpense({
        vendorId: (formData.get("vendorId") as string) || undefined,
        categoryAccountId: formData.get("categoryAccountId") as string,
        date: formData.get("date") as string,
        amount: Number(formData.get("amount")),
        gstRate: Number(formData.get("gstRate") || 0),
        isItcEligible: formData.get("isItcEligible") === "on",
        isInterState: formData.get("isInterState") === "on",
        tdsApplicable: formData.get("tdsApplicable") === "on",
        tdsSection: (formData.get("tdsSection") as string) || undefined,
        paymentMode: formData.get("paymentMode") as "bank" | "cash" | "upi" | "card" | "cheque" | "other",
        description: (formData.get("description") as string) || undefined,
        status: "recorded",
      });
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
        <Plus size={15} /> Record Expense
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4 overflow-y-auto">
          <div className="w-full max-w-lg rounded-[var(--radius-lg)] bg-paper-raised shadow-xl my-8">
            <div className="flex items-center justify-between border-b border-rule px-5 py-4">
              <h3 className="font-display text-base font-medium">Record Expense</h3>
              <button onClick={() => setOpen(false)} className="text-ink-400 hover:text-ink-700">
                <X size={18} />
              </button>
            </div>
            <form action={handleSubmit} className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required />
                </div>
                <div>
                  <Label htmlFor="amount">Amount (GST-inclusive)</Label>
                  <Input id="amount" name="amount" type="number" step="0.01" min="0" required placeholder="0.00" />
                </div>
              </div>

              <div>
                <Label htmlFor="categoryAccountId">Category</Label>
                <Select id="categoryAccountId" name="categoryAccountId" required>
                  <option value="">Select a category…</option>
                  {expenseAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} — {a.name}
                    </option>
                  ))}
                </Select>
              </div>

              {vendors.length > 0 && (
                <div>
                  <Label htmlFor="vendorId">Vendor (optional)</Label>
                  <Select id="vendorId" name="vendorId">
                    <option value="">—</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gstRate">GST Rate</Label>
                  <Select id="gstRate" name="gstRate" value={gstRate} onChange={(e) => setGstRate(Number(e.target.value))}>
                    {[0, 5, 12, 18, 28].map((r) => (
                      <option key={r} value={r}>
                        {r}%
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="paymentMode">Payment Mode</Label>
                  <Select id="paymentMode" name="paymentMode" defaultValue="bank">
                    <option value="bank">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="other">Other</option>
                  </Select>
                </div>
              </div>

              {gstRate > 0 && (
                <label className="flex items-center gap-2 text-xs text-ink-600">
                  <input type="checkbox" name="isItcEligible" defaultChecked className="rounded border-rule-strong" />
                  Eligible for Input Tax Credit (ITC)
                </label>
              )}
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input type="checkbox" name="isInterState" className="rounded border-rule-strong" />
                Inter-state purchase (IGST instead of CGST+SGST)
              </label>

              <div className="rounded-[var(--radius-md)] bg-ink-50 p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-ink-700">
                  <input
                    type="checkbox"
                    name="tdsApplicable"
                    checked={tdsApplicable}
                    onChange={(e) => setTdsApplicable(e.target.checked)}
                    className="rounded border-rule-strong"
                  />
                  TDS applicable on this expense
                </label>
                {tdsApplicable && (
                  <div className="mt-2">
                    <Select id="tdsSection" name="tdsSection" required>
                      <option value="">Select section…</option>
                      {TDS_SECTIONS.map((s) => (
                        <option key={s.code} value={s.code}>
                          {s.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="What was this for?" />
              </div>

              {error && (
                <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
              )}

              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Saving…" : "Save Expense"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
