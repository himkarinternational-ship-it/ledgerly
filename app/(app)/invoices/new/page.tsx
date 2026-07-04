import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export default async function NewInvoicePage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const [{ data: clients }, { data: tenantRow }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, gstin, billing_state, billing_state_code")
      .eq("tenant_id", tenant.id)
      .in("contact_type", ["client", "both"])
      .eq("is_active", true)
      .order("name"),
    supabase.from("tenants").select("state_code").eq("id", tenant.id).single(),
  ]);

  return (
    <>
      <Topbar
        title="New Invoice"
        actions={
          <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
            <ArrowLeft size={15} /> Back to invoices
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        {clients && clients.length === 0 && (
          <div className="mb-4 rounded-[var(--radius-md)] border border-warn-600/30 bg-warn-100 px-4 py-3 text-sm text-warn-700">
            You don&apos;t have any clients yet. Add clients in Settings → Clients first, then come back.
          </div>
        )}
        <InvoiceForm tenantId={tenant.id} supplierStateCode={tenantRow?.state_code ?? null} clients={clients ?? []} />
      </main>
    </>
  );
}
