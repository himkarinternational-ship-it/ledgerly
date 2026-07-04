import Link from "next/link";
import { Plus } from "lucide-react";
import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export default async function InvoicesPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, invoice_number, invoice_type, issue_date, due_date, total_amount, amount_paid, status, contacts:client_id(name)")
    .eq("tenant_id", tenant.id)
    .order("issue_date", { ascending: false });

  return (
    <>
      <Topbar
        title="Invoices"
        actions={
          <Link href="/invoices/new">
            <Button size="sm">
              <Plus size={15} /> New Invoice
            </Button>
          </Link>
        }
      />
      <main className="flex-1 overflow-y-auto p-6">
        <Card>
          <table className="ledger-table w-full">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Type</th>
                <th>Issue Date</th>
                <th>Due Date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-ink-400">
                    No invoices yet.{" "}
                    <Link href="/invoices/new" className="text-info-600 hover:underline">
                      Create your first invoice
                    </Link>
                  </td>
                </tr>
              )}
              {invoices?.map((inv) => (
                <tr key={inv.id}>
                  <td>
                    <Link href={`/invoices/${inv.id}`} className="font-medium text-ink-800 hover:text-info-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="text-ink-600">{(inv as unknown as { contacts?: { name: string } }).contacts?.name ?? "—"}</td>
                  <td className="text-ink-500 capitalize">{inv.invoice_type.replace(/_/g, " ")}</td>
                  <td className="text-ink-500">{inv.issue_date}</td>
                  <td className="text-ink-500">{inv.due_date ?? "—"}</td>
                  <td className="text-right font-mono tabular">{formatINR(inv.total_amount)}</td>
                  <td className="text-right font-mono tabular text-ink-500">
                    {formatINR(inv.total_amount - inv.amount_paid)}
                  </td>
                  <td className="text-right">
                    <StatusBadge status={inv.status} />
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
