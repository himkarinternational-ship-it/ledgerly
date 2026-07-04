import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getProfitAndLoss, getBalanceSheet } from "@/lib/accounting/reports";
import { financialYearLabel } from "@/lib/accounting/journal";

function currentFinancialYearStart(fyStartMonth: number): string {
  const now = new Date();
  const year = now.getMonth() + 1 >= fyStartMonth ? now.getFullYear() : now.getFullYear() - 1;
  return `${year}-${String(fyStartMonth).padStart(2, "0")}-01`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from, to } = await searchParams;
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const today = new Date().toISOString().slice(0, 10);
  const fyStart = currentFinancialYearStart(tenant.financial_year_start_month ?? 4);

  const periodStart = from || fyStart;
  const periodEnd = to || today;

  const [pl, bs] = await Promise.all([
    getProfitAndLoss(supabase, tenant.id, periodStart, periodEnd),
    getBalanceSheet(supabase, tenant.id, periodEnd, fyStart),
  ]);

  return (
    <>
      <Topbar title="Reports" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-2 text-xs text-ink-400">
          FY {financialYearLabel(periodEnd, tenant.financial_year_start_month)} · {periodStart} to {periodEnd}
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profit & Loss</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">Income</p>
                {pl.income.length === 0 && <p className="text-sm text-ink-400">No income recorded.</p>}
                {pl.income.map((r) => (
                  <ReportRow key={r.code} label={r.name} value={r.amount} />
                ))}
                <ReportRow label="Total Income" value={pl.totalIncome} bold />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">Expenses</p>
                {pl.expenses.length === 0 && <p className="text-sm text-ink-400">No expenses recorded.</p>}
                {pl.expenses.map((r) => (
                  <ReportRow key={r.code} label={r.name} value={r.amount} />
                ))}
                <ReportRow label="Total Expenses" value={pl.totalExpenses} bold />
              </div>

              <div className="border-t border-rule-strong pt-3">
                <ReportRow
                  label="Net Profit"
                  value={pl.netProfit}
                  bold
                  tone={pl.netProfit >= 0 ? "positive" : "negative"}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              {!bs.isBalanced && (
                <span className="text-xs font-medium text-negative-600">⚠ Out of balance</span>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">Assets</p>
                {bs.assets.map((r) => (
                  <ReportRow key={r.code} label={r.name} value={r.amount} />
                ))}
                <ReportRow label="Total Assets" value={bs.totalAssets} bold />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">Liabilities</p>
                {bs.liabilities.map((r) => (
                  <ReportRow key={r.code} label={r.name} value={r.amount} />
                ))}
                <ReportRow label="Total Liabilities" value={bs.totalLiabilities} bold />
              </div>

              <div>
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-ink-400">Equity</p>
                {bs.equity.map((r) => (
                  <ReportRow key={r.code} label={r.name} value={r.amount} />
                ))}
                <ReportRow label="Current Year Earnings" value={bs.currentYearEarnings} />
                <ReportRow label="Total Equity" value={bs.totalEquity} bold />
              </div>

              <div className="border-t border-rule-strong pt-3">
                <ReportRow label="Total Liabilities & Equity" value={bs.totalLiabilitiesAndEquity} bold />
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function ReportRow({
  label,
  value,
  bold,
  tone,
}: {
  label: string;
  value: number;
  bold?: boolean;
  tone?: "positive" | "negative";
}) {
  const toneClass = tone === "positive" ? "text-positive-700" : tone === "negative" ? "text-negative-600" : "text-ink-800";
  return (
    <div className={`flex items-center justify-between py-1 text-sm ${bold ? "font-semibold" : ""}`}>
      <span className={bold ? "text-ink-900" : "text-ink-600"}>{label}</span>
      <span className={`font-mono tabular ${toneClass}`}>{formatINR(value)}</span>
    </div>
  );
}
