import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NewExpenseButton } from "@/components/expenses/new-expense-dialog";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const [{ data: expenses }, { data: expenseAccounts }, { data: vendors }] = await Promise.all([
    supabase
      .from("expenses")
      .select("id, date, description, amount, gst_rate, tds_amount, status, payment_mode, contacts:vendor_id(name), accounts:category_account_id(name, code)")
      .eq("tenant_id", tenant.id)
      .order("date", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, code, name")
      .eq("tenant_id", tenant.id)
      .eq("account_type", "expense")
      .eq("is_active", true)
      .order("code"),
    supabase
      .from("contacts")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .in("contact_type", ["vendor", "both"])
      .eq("is_active", true)
      .order("name"),
  ]);

  return (
    <>
      <Topbar
        title="Expenses"
        actions={<NewExpenseButton expenseAccounts={expenseAccounts ?? []} vendors={vendors ?? []} />}
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Category</th>
                <th>Vendor</th>
                <th className="text-right">GST</th>
                <th className="text-right">TDS</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!expenses || expenses.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-ink-400">
                    No expenses recorded yet.
                  </td>
                </tr>
              )}
              {expenses?.map((exp) => (
                <tr key={exp.id}>
                  <td className="text-ink-500">{exp.date}</td>
                  <td className="font-medium text-ink-800">{exp.description ?? "—"}</td>
                  <td className="text-ink-500">{(exp as unknown as { accounts?: { name: string } }).accounts?.name ?? "—"}</td>
                  <td className="text-ink-500">{(exp as unknown as { contacts?: { name: string } }).contacts?.name ?? "—"}</td>
                  <td className="text-right font-mono tabular text-ink-500">{exp.gst_rate}%</td>
                  <td className="text-right font-mono tabular text-ink-500">
                    {exp.tds_amount > 0 ? formatINR(exp.tds_amount) : "—"}
                  </td>
                  <td className="text-right font-mono tabular font-medium">{formatINR(exp.amount)}</td>
                  <td className="text-right">
                    <StatusBadge status={exp.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
