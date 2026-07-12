import Image from "next/image";
import { formatINR } from "@/lib/accounting/money";
import type { Invoice, InvoiceItem, Contact, Tenant, BankAccount } from "@/lib/supabase/types";

export function InvoicePrintView({
  invoice,
  client,
  items,
  tenant,
  bankAccount,
  amountInWords,
}: {
  invoice: Invoice;
  client: Contact | null;
  items: InvoiceItem[];
  tenant: Tenant | null;
  bankAccount: BankAccount | null;
  amountInWords: string;
}) {
  const isIntraState = invoice.cgst_amount > 0 || invoice.sgst_amount > 0;

  return (
    <div className="mx-auto max-w-3xl rounded-[var(--radius-lg)] border border-rule bg-paper-raised p-8 print:border-none print:shadow-none">
      <div className="flex items-start justify-between border-b border-rule pb-6">
        <div>
          <h2 className="font-display text-2xl font-semibold text-ink-900">{tenant?.name ?? "—"}</h2>
          {tenant?.pan && <p className="mt-1 text-xs font-medium text-ink-600">PAN: {tenant.pan}</p>}
          <p className="mt-1 text-xs text-ink-500">
            {tenant?.address_line1}
            {tenant?.city ? `, ${tenant.city}` : ""}
            {tenant?.state ? `, ${tenant.state}` : ""} {tenant?.pincode}
          </p>
          {tenant?.gstin && <p className="mt-0.5 text-xs text-ink-500">GSTIN: {tenant.gstin}</p>}
        </div>
        <div className="text-right">
          {tenant?.logo_url && (
            <div className="mb-2 flex justify-end">
              <Image
                src={tenant.logo_url}
                alt={`${tenant.name} logo`}
                width={140}
                height={64}
                className="max-h-16 w-auto object-contain"
                unoptimized
              />
            </div>
          )}
          <p className="font-display text-lg font-medium uppercase tracking-wide text-ink-700">
            {invoice.invoice_type.replace(/_/g, " ")}
          </p>
          <p className="mt-1 font-mono text-sm tabular text-ink-500"># {invoice.invoice_number}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Billed To</p>
          <p className="mt-1 text-sm font-medium text-ink-800">{client?.name ?? "—"}</p>
          <p className="text-xs text-ink-500">
            {client?.billing_address_line1}
            {client?.billing_city ? `, ${client.billing_city}` : ""}
            {client?.billing_state ? `, ${client.billing_state}` : ""}
            {client?.billing_pincode ? `, ${client.billing_pincode}` : ""}
          </p>
          {client?.gstin && <p className="text-xs text-ink-500">GSTIN: {client.gstin}</p>}
          {!client?.gstin && client?.pan && <p className="text-xs text-ink-500">PAN: {client.pan}</p>}
        </div>
        <div className="text-right">
          <div className="grid grid-cols-2 gap-x-3 text-xs">
            <span className="text-ink-400">Issue Date</span>
            <span className="text-right font-medium text-ink-700">{invoice.issue_date}</span>
            {invoice.due_date && (
              <>
                <span className="text-ink-400">Due Date</span>
                <span className="text-right font-medium text-ink-700">{invoice.due_date}</span>
              </>
            )}
            <span className="text-ink-400">Place of Supply</span>
            <span className="text-right font-medium text-ink-700">{invoice.place_of_supply_state}</span>
          </div>
        </div>
      </div>

      <table className="mt-6 w-full text-sm">
        <thead>
          <tr className="border-b border-rule-strong text-left text-[11px] uppercase tracking-wide text-ink-500">
            <th className="py-2">Description</th>
            <th className="py-2">HSN/SAC</th>
            <th className="py-2 text-right">Qty</th>
            <th className="py-2 text-right">Rate</th>
            <th className="py-2 text-right">GST</th>
            <th className="py-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-rule">
              <td className="py-2 text-ink-800">{item.description}</td>
              <td className="py-2 text-ink-500">{item.hsn_sac_code ?? "—"}</td>
              <td className="py-2 text-right font-mono tabular text-ink-600">{item.quantity}</td>
              <td className="py-2 text-right font-mono tabular text-ink-600">{formatINR(item.rate, { withSymbol: false })}</td>
              <td className="py-2 text-right font-mono tabular text-ink-600">{item.gst_rate}%</td>
              <td className="py-2 text-right font-mono tabular text-ink-800">{formatINR(item.total_amount, { withSymbol: false })}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 flex justify-end">
        <div className="w-64 space-y-1.5 text-sm">
          <Row label="Subtotal" value={invoice.subtotal} />
          {invoice.discount_total > 0 && <Row label="Discount" value={-invoice.discount_total} />}
          <Row label="Taxable Value" value={invoice.taxable_value} />
          {isIntraState ? (
            <>
              <Row label="CGST" value={invoice.cgst_amount} muted />
              <Row label="SGST" value={invoice.sgst_amount} muted />
            </>
          ) : (
            invoice.igst_amount > 0 && <Row label="IGST" value={invoice.igst_amount} muted />
          )}
          {invoice.round_off !== 0 && <Row label="Round Off" value={invoice.round_off} muted />}
          <div className="flex justify-between border-t border-rule-strong pt-1.5 font-semibold text-ink-900">
            <span>Total</span>
            <span className="font-mono tabular">{formatINR(invoice.total_amount)}</span>
          </div>
          {invoice.tds_applicable && invoice.tds_amount > 0 && (
            <>
              <div className="flex justify-between text-xs text-ink-500">
                <span>
                  TDS {invoice.tds_section ? `@ ${invoice.tds_rate}% ${invoice.tds_section}` : ""}
                </span>
                <span className="font-mono tabular">-{formatINR(invoice.tds_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-rule pt-1.5 font-semibold text-ink-900">
                <span>Net Receivable</span>
                <span className="font-mono tabular">{formatINR(invoice.total_amount - invoice.tds_amount)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <p className="mt-4 text-xs italic text-ink-500">Amount in words: {amountInWords}</p>

      {invoice.notes && (
        <div className="mt-6 border-t border-rule pt-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Notes</p>
          <p className="mt-1 text-sm text-ink-600">{invoice.notes}</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-2 items-end gap-6 border-t border-rule pt-6">
        <div>
          {bankAccount && (
            <>
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-400">Bank Details</p>
              <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                <dt className="text-ink-400">Bank</dt>
                <dd className="font-medium text-ink-700">{bankAccount.bank_name}</dd>
                <dt className="text-ink-400">Account #</dt>
                <dd className="font-mono tabular text-ink-700">{bankAccount.account_number}</dd>
                <dt className="text-ink-400">IFSC Code</dt>
                <dd className="font-mono tabular text-ink-700">{bankAccount.ifsc_code}</dd>
                {bankAccount.branch && (
                  <>
                    <dt className="text-ink-400">Branch</dt>
                    <dd className="text-ink-700">{bankAccount.branch}</dd>
                  </>
                )}
              </dl>
            </>
          )}
        </div>

        <div className="text-right">
          <p className="text-xs text-ink-500">For {tenant?.name ?? "—"}</p>
          {tenant?.signature_url ? (
            <div className="my-2 flex justify-end">
              <Image
                src={tenant.signature_url}
                alt="Authorized signature"
                width={140}
                height={56}
                className="max-h-14 w-auto object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="my-6" />
          )}
          <p className="border-t border-rule pt-1 text-xs text-ink-500">Authorized Signatory</p>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-ink-300">This is a computer-generated invoice.</p>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${muted ? "text-xs text-ink-500" : "text-ink-700"}`}>
      <span>{label}</span>
      <span className="font-mono tabular">{formatINR(value)}</span>
    </div>
  );
}
