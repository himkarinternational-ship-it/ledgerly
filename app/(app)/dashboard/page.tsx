import { Wallet, ArrowDownCircle, ArrowUpCircle, Landmark } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getTrialBalance } from "@/lib/accounting/reports";
import { computeGstr3b } from "@/lib/gst/returns";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const today = new Date().toISOString().slice(0, 10);
  const currentPeriod = `${String(new Date().getMonth() + 1).padStart(2, "0")}-${new Date().getFullYear()}`;

  const [trialBalance, gstr3b, recentInvoices, recentExpenses, upcomingCompliance] = await Promise.all([
    getTrialBalance(supabase, tenant.id, today),
    computeGstr3b(supabase, tenant.id, currentPeriod).catch(() => null),
    supabase
      .from("invoices")
      .select("id, invoice_number, total_amount, status, issue_date, contacts:client_id(name)")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("expenses")
      .select("id, description, amount, date, status")
      .eq("tenant_id", tenant.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("compliance_events")
      .select("id, title, due_date, status")
      .eq("tenant_id", tenant.id)
      .eq("status", "pending")
      .order("due_date", { ascending: true })
      .limit(5),
  ]);

  const cashAccount = trialBalance.find((r) => r.code === "1000");
  const bankAccount = trialBalance.find((r) => r.code === "1010");
  const receivable = trialBalance.find((r) => r.code === "1100");
  const cashBalance = (cashAccount?.debit ?? 0) - (cashAccount?.credit ?? 0) + (bankAccount?.debit ?? 0) - (bankAccount?.credit ?? 0);
  const receivableBalance = (receivable?.debit ?? 0) - (receivable?.credit ?? 0);

  return (
    <>
      <Topbar title="Dashboard" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label="Cash & Bank" value={cashBalance} icon={Wallet} />
          <SummaryCard label="Receivables" value={receivableBalance} icon={ArrowDownCircle} tone="positive" />
          <SummaryCard
            label="Payables"
            value={trialBalance.filter((r) => r.accountType === "liability" && r.code === "2000").reduce((s, r) => s + r.credit - r.debit, 0)}
            icon={ArrowUpCircle}
            tone="warn"
          />
          <SummaryCard
            label="GST Liability (this month)"
            value={gstr3b?.netTaxPayable.total ?? 0}
            icon={Landmark}
            tone="negative"
            hint={gstr3b ? `Period ${gstr3b.period}` : undefined}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Invoices</CardTitle>
              <Link href="/invoices" className="text-xs font-medium text-info-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentInvoices.data && recentInvoices.data.length > 0 ? (
                <table className="ledger-table w-full">
                  <tbody>
                    {recentInvoices.data.map((inv) => (
                      <tr key={inv.id}>
                        <td className="font-medium text-ink-800">{inv.invoice_number}</td>
                        <td className="text-ink-500">{(inv as unknown as { contacts?: { name: string } }).contacts?.name ?? "—"}</td>
                        <td className="text-right font-mono tabular">{formatINR(inv.total_amount)}</td>
                        <td className="text-right"><StatusBadge status={inv.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyRow text="No invoices yet." actionHref="/invoices/new" actionLabel="Create your first invoice" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <Link href="/expenses" className="text-xs font-medium text-info-600 hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentExpenses.data && recentExpenses.data.length > 0 ? (
                <table className="ledger-table w-full">
                  <tbody>
                    {recentExpenses.data.map((exp) => (
                      <tr key={exp.id}>
                        <td className="font-medium text-ink-800">{exp.description ?? "Untitled"}</td>
                        <td className="text-ink-500">{exp.date}</td>
                        <td className="text-right font-mono tabular">{formatINR(exp.amount)}</td>
                        <td className="text-right"><StatusBadge status={exp.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyRow text="No expenses recorded yet." actionHref="/expenses" actionLabel="Record an expense" />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Compliance</CardTitle>
              <Link href="/compliance" className="text-xs font-medium text-info-600 hover:underline">
                View calendar
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {upcomingCompliance.data && upcomingCompliance.data.length > 0 ? (
                <table className="ledger-table w-full">
                  <tbody>
                    {upcomingCompliance.data.map((ev) => (
                      <tr key={ev.id}>
                        <td className="font-medium text-ink-800">{ev.title}</td>
                        <td className="text-right text-ink-500">{ev.due_date}</td>
                        <td className="text-right"><StatusBadge status={ev.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <EmptyRow text="Nothing due. You're caught up." />
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

function EmptyRow({ text, actionHref, actionLabel }: { text: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div className="px-5 py-8 text-center">
      <p className="text-sm text-ink-400">{text}</p>
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-2 inline-block text-xs font-medium text-info-600 hover:underline">
          {actionLabel} →
        </Link>
      )}
    </div>
  );
}
