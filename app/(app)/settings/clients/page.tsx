import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { NewContactButton } from "@/components/settings/new-contact-dialog";

export default async function ClientsPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("name");

  return (
    <>
      <Topbar
        title="Clients & Vendors"
        actions={
          <div className="flex items-center gap-3">
            <NewContactButton />
            <Link href="/settings" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
              <ArrowLeft size={15} /> Back
            </Link>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>GSTIN</th>
                <th>City / State</th>
                <th>Terms</th>
              </tr>
            </thead>
            <tbody>
              {(!contacts || contacts.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-ink-400">
                    No contacts yet. Add your first client or vendor.
                  </td>
                </tr>
              )}
              {contacts?.map((c) => (
                <tr key={c.id}>
                  <td className="font-medium text-ink-800">{c.name}</td>
                  <td>
                    <Badge tone="neutral">{c.contact_type}</Badge>
                  </td>
                  <td className="font-mono text-xs text-ink-500">{c.gstin ?? "—"}</td>
                  <td className="text-ink-500">
                    {c.billing_city ? `${c.billing_city}, ` : ""}
                    {c.billing_state ?? "—"}
                  </td>
                  <td className="text-ink-500">{c.payment_terms_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </main>
    </>
  );
}
