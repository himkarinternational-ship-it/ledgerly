import { Topbar } from "@/components/layout/topbar";
import { Card } from "@/components/ui/card";
import { formatINR } from "@/lib/accounting/money";
import { createClient } from "@/lib/supabase/server";
import { getCurrentTenant } from "@/lib/tenant";

export default async function JournalPage() {
  const supabase = await createClient();
  const tenant = await getCurrentTenant();

  const { data: entries } = await supabase
    .from("journal_entries")
    .select("*, journal_entry_lines(*, accounts(code, name))")
    .eq("tenant_id", tenant.id)
    .order("date", { ascending: false })
    .order("entry_number", { ascending: false })
    .limit(100);

  return (
    <>
      <Topbar title="Journal" />
      <main className="flex-1 overflow-y-auto p-6">
        <div className="space-y-3">
          {(!entries || entries.length === 0) && (
            <Card className="py-10 text-center text-ink-400">
              No journal entries yet. Entries are posted automatically when you finalize invoices and expenses.
            </Card>
          )}
          {entries?.map((entry) => (
            <Card key={entry.id}>
              <div className="flex items-center justify-between border-b border-rule px-5 py-3">
                <div>
                  <span className="font-mono text-xs text-ink-400">{entry.entry_number}</span>
                  <span className="ml-3 text-sm font-medium text-ink-800">{entry.narration}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-ink-400">{entry.date}</span>
                  {entry.is_auto_generated && (
                    <span className="rounded-full bg-info-100 px-2 py-0.5 text-[10px] font-medium text-info-600">
                      auto
                    </span>
                  )}
                </div>
              </div>
              <table className="ledger-table w-full">
                <thead>
                  <tr>
                    <th>Account</th>
                    <th className="text-right">Debit</th>
                    <th className="text-right">Credit</th>
                  </tr>
                </thead>
                <tbody>
                  {(entry as unknown as { journal_entry_lines?: Array<{ id: string; accounts?: { code: string; name: string }; debit: number; credit: number }> }).journal_entry_lines?.map((line) => (
                    <tr key={line.id}>
                      <td className="text-ink-700">
                        <span className="font-mono text-xs text-ink-400">{line.accounts?.code}</span>{" "}
                        {line.accounts?.name}
                      </td>
                      <td className="text-right font-mono tabular">{line.debit > 0 ? formatINR(line.debit) : ""}</td>
                      <td className="text-right font-mono tabular">{line.credit > 0 ? formatINR(line.credit) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      </main>
    </>
  );
}
