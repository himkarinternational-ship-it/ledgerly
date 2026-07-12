import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { InvoiceForm } from "@/components/invoices/invoice-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, invoice_items(*)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();

  if (!invoice) notFound();

  // Editing is only safe for drafts — a finalized invoice already has a
  // journal entry posted against it, so redirect back to the read-only view.
  if (invoice.status !== "draft") {
    redirect(`/invoices/${id}`);
  }

  const [{ data: clients }, { data: tenantRow }, { data: bankAccounts }] = await Promise.all([
    supabase
      .from("contacts")
      .select("id, name, gstin, billing_state, billing_state_code")
      .eq("tenant_id", tenant.id)
      .in("contact_type", ["client", "both"])
      .eq("is_active", true)
      .order("name"),
    supabase.from("tenants").select("state_code").eq("id", tenant.id).single(),
    supabase
      .from("bank_accounts")
      .select("id, bank_name, account_number, is_primary")
      .eq("tenant_id", tenant.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false }),
  ]);

  const lineItems = (invoice.invoice_items ?? [])
    .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order)
    .map((item: { description: string; hsn_sac_code: string | null; quantity: number; unit: string | null; rate: number; discount_percent: number; gst_rate: number }) => ({
      description: item.description,
      hsnSacCode: item.hsn_sac_code ?? "",
      quantity: item.quantity,
      unit: item.unit ?? "unit",
      rate: item.rate,
      discountPercent: item.discount_percent,
      gstRate: item.gst_rate,
    }));

  return (
    <>
      <Topbar
        title={`Edit ${invoice.invoice_number}`}
        actions={
          <Link href={`/invoices/${id}`} className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
            <ArrowLeft size={15} /> Back to invoice
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <InvoiceForm
          tenantId={tenant.id}
          supplierStateCode={tenantRow?.state_code ?? null}
          clients={clients ?? []}
          bankAccounts={bankAccounts ?? []}
          existingInvoice={{
            id: invoice.id,
            invoiceType: invoice.invoice_type,
            clientId: invoice.client_id ?? "",
            issueDate: invoice.issue_date,
            dueDate: invoice.due_date ?? "",
            placeOfSupplyStateCode: invoice.place_of_supply_state_code ?? "",
            notes: invoice.notes ?? "",
            bankAccountId: invoice.bank_account_id ?? "",
            tdsApplicable: invoice.tds_applicable ?? false,
            tdsSection: invoice.tds_section ?? "",
            lineItems,
          }}
        />
      </main>
    </>
  );
}
