"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatINR } from "@/lib/accounting/money";
import type { Gstr1Result, Gstr3bResult } from "@/lib/gst/returns";

export function GstReturnView({
  period,
  gstr1,
  gstr3b,
}: {
  period: string;
  gstr1: Gstr1Result;
  gstr3b: Gstr3bResult;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"gstr1" | "gstr3b">("gstr3b");
  const [mm, yyyy] = period.split("-");

  function handlePeriodChange(newPeriod: string) {
    router.push(`/gst?period=${newPeriod}`);
  }

  function downloadJson(data: unknown, filename: string) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Input
            type="month"
            value={`${yyyy}-${mm}`}
            onChange={(e) => {
              const [y, m] = e.target.value.split("-");
              handlePeriodChange(`${m}-${y}`);
            }}
            className="w-44"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("gstr3b")}
            className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium ${
              tab === "gstr3b" ? "bg-ink-800 text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            GSTR-3B
          </button>
          <button
            onClick={() => setTab("gstr1")}
            className={`rounded-[var(--radius-md)] px-4 py-2 text-sm font-medium ${
              tab === "gstr1" ? "bg-ink-800 text-white" : "bg-ink-100 text-ink-600"
            }`}
          >
            GSTR-1
          </button>
        </div>
      </div>

      {tab === "gstr3b" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>3.1 Outward Taxable Supplies</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Taxable Value" value={gstr3b.outwardTaxableSupplies.taxableValue} />
              <Stat label="IGST" value={gstr3b.outwardTaxableSupplies.igst} />
              <Stat label="CGST" value={gstr3b.outwardTaxableSupplies.cgst} />
              <Stat label="SGST" value={gstr3b.outwardTaxableSupplies.sgst} />
              <Stat label="Cess" value={gstr3b.outwardTaxableSupplies.cess} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Eligible ITC (from recorded expenses)</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-4">
              <Stat label="IGST" value={gstr3b.eligibleItc.igst} />
              <Stat label="CGST" value={gstr3b.eligibleItc.cgst} />
              <Stat label="SGST" value={gstr3b.eligibleItc.sgst} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Net Tax Payable</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadJson(gstr3b, `GSTR3B-${period}.json`)}>
                <Download size={14} /> Export JSON
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="IGST" value={gstr3b.netTaxPayable.igst} />
              <Stat label="CGST" value={gstr3b.netTaxPayable.cgst} />
              <Stat label="SGST" value={gstr3b.netTaxPayable.sgst} />
              <Stat label="Cess" value={gstr3b.netTaxPayable.cess} />
              <Stat label="Total" value={gstr3b.netTaxPayable.total} bold />
            </CardContent>
          </Card>
          <p className="text-xs text-ink-400">
            This computes the return from your recorded invoices and ITC-eligible expenses. File the actual return
            on the GST portal — export the JSON above as a reference while manual GSTN upload isn&apos;t yet wired up.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
              <Button size="sm" variant="outline" onClick={() => downloadJson(gstr1, `GSTR1-${period}.json`)}>
                <Download size={14} /> Export JSON
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-5">
              <Stat label="Invoices" value={gstr1.totals.totalInvoices} isCount />
              <Stat label="Taxable Value" value={gstr1.totals.totalTaxableValue} />
              <Stat label="CGST" value={gstr1.totals.totalCgst} />
              <Stat label="SGST" value={gstr1.totals.totalSgst} />
              <Stat label="IGST" value={gstr1.totals.totalIgst} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>B2B Invoices ({gstr1.b2b.length})</CardTitle>
            </CardHeader>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Client</th>
                  <th>GSTIN</th>
                  <th>Place of Supply</th>
                  <th className="text-right">Taxable</th>
                  <th className="text-right">Tax</th>
                  <th className="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {gstr1.b2b.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-ink-400">
                      No B2B invoices this period.
                    </td>
                  </tr>
                )}
                {gstr1.b2b.map((inv) => (
                  <tr key={inv.invoiceNumber}>
                    <td className="font-medium text-ink-800">{inv.invoiceNumber}</td>
                    <td className="text-ink-600">{inv.clientName}</td>
                    <td className="font-mono text-xs text-ink-500">{inv.clientGstin}</td>
                    <td className="text-ink-500">{inv.placeOfSupply}</td>
                    <td className="text-right font-mono tabular">{formatINR(inv.taxableValue)}</td>
                    <td className="text-right font-mono tabular">{formatINR(inv.cgst + inv.sgst + inv.igst)}</td>
                    <td className="text-right font-mono tabular font-medium">{formatINR(inv.invoiceValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>B2C Summary (state-wise)</CardTitle>
            </CardHeader>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>State</th>
                  <th className="text-right">Taxable Value</th>
                  <th className="text-right">CGST</th>
                  <th className="text-right">SGST</th>
                  <th className="text-right">IGST</th>
                </tr>
              </thead>
              <tbody>
                {gstr1.b2cSummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-ink-400">
                      No B2C supplies this period.
                    </td>
                  </tr>
                )}
                {gstr1.b2cSummary.map((s) => (
                  <tr key={s.stateCode}>
                    <td className="text-ink-700">{s.stateName}</td>
                    <td className="text-right font-mono tabular">{formatINR(s.taxableValue)}</td>
                    <td className="text-right font-mono tabular">{formatINR(s.cgst)}</td>
                    <td className="text-right font-mono tabular">{formatINR(s.sgst)}</td>
                    <td className="text-right font-mono tabular">{formatINR(s.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>HSN/SAC Summary</CardTitle>
            </CardHeader>
            <table className="ledger-table w-full">
              <thead>
                <tr>
                  <th>HSN/SAC</th>
                  <th>Description</th>
                  <th className="text-right">Qty</th>
                  <th className="text-right">Total Value</th>
                  <th className="text-right">Taxable Value</th>
                </tr>
              </thead>
              <tbody>
                {gstr1.hsnSummary.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-ink-400">
                      No line items this period.
                    </td>
                  </tr>
                )}
                {gstr1.hsnSummary.map((h) => (
                  <tr key={h.hsnCode}>
                    <td className="font-mono text-xs text-ink-700">{h.hsnCode}</td>
                    <td className="text-ink-600">{h.description}</td>
                    <td className="text-right font-mono tabular">{h.totalQuantity}</td>
                    <td className="text-right font-mono tabular">{formatINR(h.totalValue)}</td>
                    <td className="text-right font-mono tabular">{formatINR(h.taxableValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, bold, isCount }: { label: string; value: number; bold?: boolean; isCount?: boolean }) {
  return (
    <div>
      <p className="text-xs text-ink-400">{label}</p>
      <p className={`font-mono tabular ${bold ? "text-lg font-semibold text-ink-900" : "text-sm font-medium text-ink-700"}`}>
        {isCount ? value : formatINR(value)}
      </p>
    </div>
  );
}
