import Link from "next/link";
import { Topbar } from "@/components/layout/topbar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { getTrialBalance } from "@/lib/accounting/reports";
import { NewPartnerButton } from "@/components/partners/new-partner-dialog";

export default async function PartnersPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: partners }, trialBalance] = await Promise.all([
    supabase.from("partners").select("*").eq("tenant_id", tenant.id).eq("is_active", true).order("name"),
    getTrialBalance(supabase, tenant.id, today),
  ]);

  const balanceMap = new Map(trialBalance.map((r) => [r.accountId, r]));

  return (
    <>
      <Topbar title="Partners" actions={<NewPartnerButton tenantId={tenant.id} />} />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <Link
            href="/partners/remuneration"
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] border border-rule-strong bg-paper-raised px-4 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
          >
            Section 40(b) Remuneration Calculator →
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {(!partners || partners.length === 0) && (
            <Card className="lg:col-span-2">
              <CardContent className="py-10 text-center text-ink-400">
                No partners added yet. Add each partner along with their profit share to enable
                capital account tracking and remuneration calculations.
              </CardContent>
            </Card>
          )}

          {partners?.map((partner) => {
            const capitalBal = partner.capital_account_id ? balanceMap.get(partner.capital_account_id) : undefined;
            const currentBal = partner.current_account_id ? balanceMap.get(partner.current_account_id) : undefined;
            const capitalNet = (capitalBal?.credit ?? 0) - (capitalBal?.debit ?? 0);
            const currentNet = (currentBal?.credit ?? 0) - (currentBal?.debit ?? 0);

            return (
              <Card key={partner.id}>
                <CardHeader>
                  <CardTitle>{partner.name}</CardTitle>
                  <span className="text-xs font-medium text-ink-500">
                    {partner.profit_share_percent}% share
                    {partner.is_working_partner ? " · Working Partner" : ""}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-500">Capital Account</span>
                    <span className="font-mono tabular font-medium text-ink-800">{formatINR(capitalNet)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-ink-500">Current Account</span>
                    <span className="font-mono tabular font-medium text-ink-800">{formatINR(currentNet)}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-rule pt-3">
                    <span className="text-sm font-medium text-ink-700">Total Interest</span>
                    <span className="font-mono tabular text-ink-500">{partner.interest_on_capital_rate}% p.a.</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </>
  );
}
