import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { SeedComplianceButton } from "@/components/compliance/seed-compliance-button";

export default async function CompliancePage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: events } = await supabase
    .from("compliance_events")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("due_date", { ascending: true });

  return (
    <>
      <Topbar title="Compliance Calendar" actions={<SeedComplianceButton tenantId={tenant.id} />} />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Due Date</th>
                <th>Event</th>
                <th>Type</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!events || events.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-ink-400">
                    No compliance events set up yet. Click &quot;Add Standard GST/TDS Calendar&quot; to generate the
                    recurring monthly and quarterly due dates.
                  </td>
                </tr>
              )}
              {events?.map((ev) => (
                <tr key={ev.id}>
                  <td className="font-mono tabular text-ink-700">{ev.due_date}</td>
                  <td className="font-medium text-ink-800">{ev.title}</td>
                  <td className="text-ink-500">{ev.event_type}</td>
                  <td className="text-right">
                    <StatusBadge status={ev.status} />
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
