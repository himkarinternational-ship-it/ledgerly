"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/accounting/money";
import { calculateSection40bLimit, distributeRemuneration, type PartnerShare } from "@/lib/accounting/remuneration";
import { saveRemunerationCalculation } from "@/app/(app)/partners/remuneration/actions";

export function RemunerationCalculator({
  tenantId,
  partners,
  defaultFinancialYear,
}: {
  tenantId: string;
  partners: PartnerShare[];
  defaultFinancialYear: string;
}) {
  const [netProfit, setNetProfit] = useState(0);
  const [addBackRemuneration, setAddBackRemuneration] = useState(0);
  const [addBackInterest, setAddBackInterest] = useState(0);
  const [addBackDisallowed, setAddBackDisallowed] = useState(0);
  const [financialYear, setFinancialYear] = useState(defaultFinancialYear);
  const [distributionMethod, setDistributionMethod] = useState<"equal" | "profit_share">("equal");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const result = useMemo(
    () =>
      calculateSection40bLimit({
        netProfitAsPerPL: netProfit,
        addBackRemuneration,
        addBackPartnerInterest: addBackInterest,
        addBackDisallowedExpenses: addBackDisallowed,
      }),
    [netProfit, addBackRemuneration, addBackInterest, addBackDisallowed]
  );

  const distribution = useMemo(
    () => distributeRemuneration(result.maxAllowableRemuneration, partners, distributionMethod),
    [result.maxAllowableRemuneration, partners, distributionMethod]
  );

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      const res = await saveRemunerationCalculation({
        tenantId,
        financialYear,
        netProfitAsPerPL: netProfit,
        addBackRemuneration,
        addBackPartnerInterest: addBackInterest,
        addBackDisallowedExpenses: addBackDisallowed,
        bookProfit: result.bookProfit,
        maxAllowableRemuneration: result.maxAllowableRemuneration,
        breakdown: result.breakdown,
      });
      if (res?.success) setSaved(true);
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Book Profit Inputs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="financialYear">Financial Year</Label>
            <Input id="financialYear" value={financialYear} onChange={(e) => setFinancialYear(e.target.value)} placeholder="2026-27" />
          </div>
          <div>
            <Label htmlFor="netProfit">Net Profit as per Profit & Loss Account</Label>
            <Input
              id="netProfit"
              type="number"
              step="0.01"
              value={netProfit || ""}
              onChange={(e) => setNetProfit(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="addBackRemuneration">Add back: Remuneration already debited to P&L</Label>
            <Input
              id="addBackRemuneration"
              type="number"
              step="0.01"
              value={addBackRemuneration || ""}
              onChange={(e) => setAddBackRemuneration(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="addBackInterest">Add back: Partner interest already debited to P&L</Label>
            <Input
              id="addBackInterest"
              type="number"
              step="0.01"
              value={addBackInterest || ""}
              onChange={(e) => setAddBackInterest(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label htmlFor="addBackDisallowed">Add back: Other disallowed expenses</Label>
            <Input
              id="addBackDisallowed"
              type="number"
              step="0.01"
              value={addBackDisallowed || ""}
              onChange={(e) => setAddBackDisallowed(Number(e.target.value))}
              placeholder="0.00"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle>Calculation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.breakdown.map((step, idx) => {
              const isTotal = step.step.startsWith("Book Profit") || step.step.startsWith("Maximum");
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-sm ${
                    isTotal ? "border-t border-rule pt-2 font-semibold text-ink-900" : "text-ink-600"
                  }`}
                >
                  <span className="pr-4">{step.step}</span>
                  <span className="font-mono tabular whitespace-nowrap">{formatINR(step.amount)}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {partners.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Distribution Among Working Partners</CardTitle>
              <select
                value={distributionMethod}
                onChange={(e) => setDistributionMethod(e.target.value as "equal" | "profit_share")}
                className="rounded-[var(--radius-sm)] border border-rule-strong px-2 py-1 text-xs"
              >
                <option value="equal">Equal Split</option>
                <option value="profit_share">By Profit Share</option>
              </select>
            </CardHeader>
            <CardContent className="space-y-2">
              {distribution.map((d) => (
                <div key={d.partnerId} className="flex items-center justify-between text-sm">
                  <span className="text-ink-700">{d.partnerName}</span>
                  <span className="font-mono tabular font-medium text-ink-900">{formatINR(d.amount)}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Button onClick={handleSave} disabled={isPending || !financialYear} className="w-full">
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save this calculation"}
        </Button>
        <p className="text-[11px] text-ink-400">
          This is the statutory maximum. Actual remuneration paid must also comply with the limit stated in your
          partnership deed, whichever is lower.
        </p>
      </div>
    </div>
  );
}
