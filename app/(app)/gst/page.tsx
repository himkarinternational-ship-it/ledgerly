import { Topbar } from "@/components/layout/topbar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { computeGstr1, computeGstr3b } from "@/lib/gst/returns";
import { GstReturnView } from "@/components/gst/gst-return-view";

function currentPeriod(): string {
  const now = new Date();
  return `${String(now.getMonth() + 1).padStart(2, "0")}-${now.getFullYear()}`;
}

export default async function GstPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = periodParam || currentPeriod();

  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const [gstr1, gstr3b] = await Promise.all([
    computeGstr1(supabase, tenant.id, period),
    computeGstr3b(supabase, tenant.id, period),
  ]);

  return (
    <>
      <Topbar title="GST Returns" />
      <main className="flex-1 overflow-y-auto p-6">
        <GstReturnView period={period} gstr1={gstr1} gstr3b={gstr3b} />
      </main>
    </>
  );
}
