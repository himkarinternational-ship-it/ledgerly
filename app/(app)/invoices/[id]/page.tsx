import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer, Download } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { numberToWordsINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";
import { InvoicePrintView } from "@/components/invoices/invoice-print-view";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, contacts:client_id(*), invoice_items(*)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();

  if (!invoice) notFound();

  const { data: tenantRow } = await supabase.from("tenants").select("*").eq("id", tenant.id).single();

  return (
    <>
      <Topbar
        title={invoice.invoice_number}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={invoice.status} />
            <Link href="/invoices" className="flex items-center gap-1.5 text-sm text-ink-500 hover:text-ink-800">
              <ArrowLeft size={15} /> Back
            </Link>
          </div>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="mb-4 flex justify-end gap-2 no-print">
          <Button variant="outline" size="sm">
            <Download size={14} /> Download PDF
          </Button>
          <form>
            <Button size="sm" type="submit" formAction="javascript:window.print()">
              <Printer size={14} /> Print
            </Button>
          </form>
        </div>

        <InvoicePrintView
          invoice={invoice}
          client={invoice.contacts}
          items={invoice.invoice_items}
          tenant={tenantRow}
          amountInWords={numberToWordsINR(invoice.total_amount)}
        />
      </main>
    </>
  );
}
