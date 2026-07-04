import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getTrialBalance } from "@/lib/accounting/reports";
import { formatINR } from "@/lib/accounting/money";
import { cn } from "@/lib/utils/cn";
import { NewAccountButton } from "@/components/accounts/new-account-dialog";
import type { AccountType } from "@/lib/supabase/types";

const typeLabels: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};

const typeOrder: AccountType[] = ["asset", "liability", "equity", "income", "expense"];

export default async function AccountsPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("code");

  const today = new Date().toISOString().slice(0, 10);
  const balances = await getTrialBalance(supabase, tenant.id, today);
  const balanceMap = new Map(balances.map((b) => [b.accountId, b]));

  const grouped = typeOrder.map((type) => ({
    type,
    accounts: (accounts ?? []).filter((a) => a.account_type === type),
  }));

  return (
    <>
      <Topbar title="Chart of Accounts" actions={<NewAccountButton tenantId={tenant.id} />} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-5">
          {grouped.map(({ type, accounts: list }) => (
            <Card key={type}>
              <div className="border-b border-rule px-5 py-3">
                <h3 className="font-display text-sm font-medium text-ink-900">{typeLabels[type]}</h3>
              </div>
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th className="w-20">Code</th>
                    <th>Account Name</th>
                    <th>Subtype</th>
                    <th className="text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-ink-400">
                        No accounts in this category yet.
                      </td>
                    </tr>
                  )}
                  {list.map((acct) => {
                    const bal = balanceMap.get(acct.id);
                    const net = (bal?.debit ?? 0) - (bal?.credit ?? 0);
                    const displayNet = type === "asset" || type === "expense" ? net : -net;
                    return (
                      <tr key={acct.id}>
                        <td className="font-mono tabular text-ink-500">{acct.code}</td>
                        <td className="font-medium text-ink-800">
                          {acct.name}
                          {acct.is_system && (
                            <span className="ml-2 text-[10px] uppercase tracking-wide text-ink-400">system</span>
                          )}
                        </td>
                        <td className="text-ink-400">{acct.account_subtype?.replace(/_/g, " ") ?? "—"}</td>
                        <td
                          className={cn(
                            "text-right font-mono tabular",
                            displayNet < 0 ? "text-negative-600" : "text-ink-800"
                          )}
                        >
                          {formatINR(Math.abs(displayNet))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
