import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { RemunerationCalculator } from "@/components/partners/remuneration-calculator";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { financialYearLabel } from "@/lib/accounting/journal";

export default async function RemunerationPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: partners } = await supabase
    .from("partners")
    .select("id, name, profit_share_percent, is_working_partner")
    .eq("tenant_id", tenant.id)
    .eq("is_active", true)
    .order("name");

  const defaultFy = financialYearLabel(new Date().toISOString().slice(0, 10));

  return (
    <>
      <Topbar
        title="Section 40(b) Remuneration Calculator"
        actions={
          <Link href="/partners" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
            <ArrowLeft size={15} /> Back to Partners
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <RemunerationCalculator
          tenantId={tenant.id}
          partners={(partners ?? []).map((p) => ({
            partnerId: p.id,
            partnerName: p.name,
            profitSharePercent: p.profit_share_percent,
            isWorkingPartner: p.is_working_partner,
          }))}
          defaultFinancialYear={defaultFy}
        />
      </main>
    </>
  );
}
