"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea, NumberInput } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GST_STATE_CODES } from "@/lib/gst/calculator";
import { previewInvoiceTotals } from "@/lib/gst/preview";
import { formatINR } from "@/lib/accounting/money";
import { finalizeAndRedirect } from "@/app/(app)/invoices/actions";
import { cn } from "@/lib/utils/cn";
import { TDS_SECTION_LIST } from "@/lib/gst/tds";

interface ClientOption {
  id: string;
  name: string;
  gstin: string | null;
  billing_state: string | null;
  billing_state_code: string | null;
}

interface BankAccountOption {
  id: string;
  bank_name: string;
  account_number: string;
  is_primary: boolean;
}

interface LineItemRow {
  description: string;
  hsnSacCode: string;
  quantity: number;
  unit: string;
  rate: number;
  discountPercent: number;
  gstRate: number;
}

const emptyLine: LineItemRow = {
  description: "",
  hsnSacCode: "",
  quantity: 1,
  unit: "unit",
  rate: 0,
  discountPercent: 0,
  gstRate: 18,
};

export function InvoiceForm({
  tenantId,
  supplierStateCode,
  clients,
  bankAccounts,
}: {
  tenantId: string;
  supplierStateCode: string | null;
  clients: ClientOption[];
  bankAccounts: BankAccountOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [invoiceType, setInvoiceType] = useState<"tax_invoice" | "bill_of_supply" | "export" | "proforma">("tax_invoice");
  const [clientId, setClientId] = useState("");
  const [issueDate, setIssueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [placeOfSupplyStateCode, setPlaceOfSupplyStateCode] = useState("");
  const [notes, setNotes] = useState("");
  const [bankAccountId, setBankAccountId] = useState(
    () => bankAccounts.find((b) => b.is_primary)?.id ?? bankAccounts[0]?.id ?? ""
  );
  const [tdsApplicable, setTdsApplicable] = useState(false);
  const [tdsSection, setTdsSection] = useState("");
  const [lines, setLines] = useState<LineItemRow[]>([{ ...emptyLine }]);

  const selectedClient = clients.find((c) => c.id === clientId);

  // Auto-fill place of supply from client's billing state when selected
  function handleClientChange(id: string) {
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    if (c?.billing_state_code) setPlaceOfSupplyStateCode(c.billing_state_code);
  }

  const supplyType = useMemo(() => {
    if (invoiceType === "export") return "export" as const;
    if (!supplierStateCode || !placeOfSupplyStateCode) return "intra_state" as const;
    return supplierStateCode === placeOfSupplyStateCode ? ("intra_state" as const) : ("inter_state" as const);
  }, [invoiceType, supplierStateCode, placeOfSupplyStateCode]);

  const totals = useMemo(() => previewInvoiceTotals(lines, supplyType), [lines, supplyType]);

  const tdsRate = tdsApplicable && tdsSection ? TDS_SECTION_LIST.find((s) => s.code === tdsSection)?.rate ?? 0 : 0;
  const tdsAmount = tdsApplicable ? Math.round((totals.taxableValue * tdsRate) / 100 * 100) / 100 : 0;
  const netReceivable = totals.total - tdsAmount;

  function updateLine(idx: number, patch: Partial<LineItemRow>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { ...emptyLine }]);
  }

  function removeLine(idx: number) {
    setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  function handleSubmit(status: "draft" | "sent") {
    setError(null);
    if (!clientId) {
      setError("Please select a client.");
      return;
    }
    if (!placeOfSupplyStateCode) {
      setError("Please select place of supply.");
      return;
    }
    if (lines.some((l) => !l.description.trim())) {
      setError("Every line item needs a description.");
      return;
    }

    startTransition(async () => {
      const result = await finalizeAndRedirect({
        tenantId,
        invoiceType,
        clientId,
        issueDate,
        dueDate: dueDate || undefined,
        placeOfSupplyState: GST_STATE_CODES[placeOfSupplyStateCode] ?? "",
        placeOfSupplyStateCode,
        notes: notes || undefined,
        bankAccountId: bankAccountId || undefined,
        tdsApplicable,
        tdsSection: tdsApplicable ? tdsSection || undefined : undefined,
        lineItems: lines.map((l) => ({
          description: l.description,
          hsnSacCode: l.hsnSacCode || undefined,
          quantity: l.quantity,
          unit: l.unit,
          rate: l.rate,
          discountPercent: l.discountPercent,
          gstRate: l.gstRate,
        })),
        status,
      });
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="invoiceType">Invoice Type</Label>
                <Select id="invoiceType" value={invoiceType} onChange={(e) => setInvoiceType(e.target.value as typeof invoiceType)}>
                  <option value="tax_invoice">Tax Invoice</option>
                  <option value="bill_of_supply">Bill of Supply</option>
                  <option value="export">Export Invoice</option>
                  <option value="proforma">Proforma Invoice</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="client">Client</Label>
                <Select id="client" value={clientId} onChange={(e) => handleClientChange(e.target.value)}>
                  <option value="">Select a client…</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.gstin ? `(${c.gstin})` : ""}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="issueDate">Issue Date</Label>
                <Input id="issueDate" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="placeOfSupply">Place of Supply</Label>
                <Select
                  id="placeOfSupply"
                  value={placeOfSupplyStateCode}
                  onChange={(e) => setPlaceOfSupplyStateCode(e.target.value)}
                >
                  <option value="">Select state…</option>
                  {Object.entries(GST_STATE_CODES).map(([code, name]) => (
                    <option key={code} value={code}>
                      {name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            {selectedClient && placeOfSupplyStateCode && (
              <p className="text-xs text-ink-400">
                Supply type:{" "}
                <span className="font-medium text-ink-600">
                  {supplyType === "intra_state" ? "Intra-state (CGST + SGST)" : supplyType === "export" ? "Export" : "Inter-state (IGST)"}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
            <Button size="sm" variant="outline" onClick={addLine} type="button">
              <Plus size={14} /> Add Line
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 p-4">
            {lines.map((line, idx) => {
              const lineTotal = previewInvoiceTotals([line], supplyType);
              return (
                <div key={idx} className="rounded-[var(--radius-md)] border border-rule p-3">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 sm:col-span-5">
                      <Label>Description</Label>
                      <Input
                        value={line.description}
                        onChange={(e) => updateLine(idx, { description: e.target.value })}
                        placeholder="Service or item description"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label>HSN/SAC</Label>
                      <Input value={line.hsnSacCode} onChange={(e) => updateLine(idx, { hsnSacCode: e.target.value })} />
                    </div>
                    <div className="col-span-4 sm:col-span-1">
                      <Label>Qty</Label>
                      <NumberInput
                        value={line.quantity}
                        onChange={(e) => updateLine(idx, { quantity: Number(e.target.value) })}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-4 sm:col-span-2">
                      <Label>Rate</Label>
                      <NumberInput
                        value={line.rate}
                        onChange={(e) => updateLine(idx, { rate: Number(e.target.value) })}
                        min={0}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1">
                      <Label>Disc %</Label>
                      <NumberInput
                        value={line.discountPercent}
                        onChange={(e) => updateLine(idx, { discountPercent: Number(e.target.value) })}
                        min={0}
                        max={100}
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-1">
                      <Label>GST %</Label>
                      <Select
                        value={line.gstRate}
                        onChange={(e) => updateLine(idx, { gstRate: Number(e.target.value) })}
                      >
                        {[0, 5, 12, 18, 28].map((r) => (
                          <option key={r} value={r}>
                            {r}%
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => removeLine(idx)}
                      className="flex items-center gap-1 text-xs text-negative-600 hover:underline disabled:opacity-30"
                      disabled={lines.length === 1}
                    >
                      <Trash2 size={12} /> Remove
                    </button>
                    <p className="font-mono text-xs tabular text-ink-500">
                      Line total: <span className="font-medium text-ink-800">{formatINR(lineTotal.total)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {bankAccounts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="bankAccount">Bank Account to Show on Invoice</Label>
              <Select id="bankAccount" value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)}>
                <option value="">Don&apos;t show bank details</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bank_name} — ****{b.account_number.slice(-4)}
                  </option>
                ))}
              </Select>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>TDS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="flex items-center gap-2 text-sm text-ink-600">
              <input
                type="checkbox"
                checked={tdsApplicable}
                onChange={(e) => setTdsApplicable(e.target.checked)}
                className="rounded border-rule-strong"
              />
              Client will deduct TDS before paying this invoice
            </label>
            {tdsApplicable && (
              <div>
                <Label htmlFor="tdsSection">TDS Section</Label>
                <Select id="tdsSection" value={tdsSection} onChange={(e) => setTdsSection(e.target.value)}>
                  <option value="">Select section…</option>
                  {TDS_SECTION_LIST.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.label} ({s.rate}%)
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-[11px] text-ink-400">
                  TDS is calculated on the taxable value (excluding GST), per standard practice.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Payment instructions, thank-you note, etc." />
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-1">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <SummaryRow label="Subtotal" value={totals.subtotal} />
            {totals.discountTotal > 0 && <SummaryRow label="Discount" value={-totals.discountTotal} />}
            <SummaryRow label="Taxable Value" value={totals.taxableValue} />
            {supplyType === "intra_state" ? (
              <>
                <SummaryRow label="CGST" value={totals.cgst} muted />
                <SummaryRow label="SGST" value={totals.sgst} muted />
              </>
            ) : (
              <SummaryRow label="IGST" value={totals.igst} muted />
            )}
            {totals.roundOff !== 0 && <SummaryRow label="Round Off" value={totals.roundOff} muted />}
            <div className="border-t border-rule pt-2">
              <SummaryRow label="Total (Invoice Amount)" value={totals.total} bold />
            </div>
            {tdsApplicable && tdsAmount > 0 && (
              <>
                <SummaryRow label={`TDS (${tdsSection || "—"} @ ${tdsRate}%)`} value={-tdsAmount} muted />
                <div className="border-t border-rule pt-2">
                  <SummaryRow label="Net Receivable" value={netReceivable} bold />
                </div>
              </>
            )}

            {error && (
              <p className="rounded-[var(--radius-md)] bg-negative-100 px-3 py-2 text-xs text-negative-700">{error}</p>
            )}

            <div className="flex flex-col gap-2 pt-3">
              <Button onClick={() => handleSubmit("sent")} disabled={isPending}>
                {isPending ? "Saving…" : "Save & Finalize"}
              </Button>
              <Button variant="outline" onClick={() => handleSubmit("draft")} disabled={isPending}>
                Save as Draft
              </Button>
              <Button variant="ghost" type="button" onClick={() => router.back()} disabled={isPending}>
                Cancel
              </Button>
            </div>
            <p className="pt-1 text-[11px] text-ink-400">
              Finalizing posts the entry to your ledger immediately. Drafts don&apos;t affect your books until finalized.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryRow({ label, value, muted, bold }: { label: string; value: number; muted?: boolean; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={cn("text-ink-500", muted && "text-xs text-ink-400")}>{label}</span>
      <span className={cn("font-mono tabular", bold ? "text-base font-semibold text-ink-900" : muted ? "text-xs text-ink-500" : "text-ink-800")}>
        {formatINR(value)}
      </span>
    </div>
  );
}
