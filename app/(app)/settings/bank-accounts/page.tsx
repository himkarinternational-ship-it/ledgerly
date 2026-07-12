import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NewBankAccountButton } from "@/components/settings/new-bank-account-dialog";

export default async function BankAccountsPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: bankAccounts } = await supabase
    .from("bank_accounts")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("is_primary", { ascending: false });

  return (
    <>
      <Topbar
        title="Bank Accounts"
        actions={
          <div className="flex items-center gap-3">
            <NewBankAccountButton />
            <Link href="/settings" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
              <ArrowLeft size={15} /> Back
            </Link>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        {(!bankAccounts || bankAccounts.length === 0) ? (
          <Card className="py-10 text-center text-ink-400">
            No bank accounts added yet. Add one to show bank details on your invoices.
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {bankAccounts.map((acct) => (
              <Card key={acct.id} className="px-5 py-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-medium text-ink-800">{acct.bank_name}</p>
                  {acct.is_primary && <Badge tone="info">Primary</Badge>}
                </div>
                <dl className="space-y-1 text-sm">
                  <Row label="Account #" value={acct.account_number} />
                  <Row label="IFSC" value={acct.ifsc_code ?? "—"} />
                  <Row label="Branch" value={acct.branch ?? "—"} />
                  <Row label="Type" value={acct.account_type ?? "—"} capitalize />
                  <Row label="Balance" value={formatINR(acct.current_balance)} />
                </dl>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

function Row({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) {
  return (
    <div className="flex justify-between">
      <dt className="text-ink-400">{label}</dt>
      <dd className={`font-mono text-xs tabular text-ink-700 ${capitalize ? "capitalize" : ""}`}>{value}</dd>
    </div>
  );
}
