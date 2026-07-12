"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Pencil, Trash2, Ban } from "lucide-react";
import { deleteInvoice, cancelInvoice } from "@/app/(app)/invoices/actions";

export function InvoiceRowActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState<"delete" | "cancel" | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isDraft = status === "draft";
  const isCancelled = status === "cancelled";

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const result = await deleteInvoice(invoiceId);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setConfirming(null);
        router.refresh();
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelInvoice(invoiceId);
      if (result?.error) setError(result.error);
      else {
        setOpen(false);
        setConfirming(null);
        router.refresh();
      }
    });
  }

  if (isCancelled) {
    return <span className="text-xs text-ink-300">—</span>;
  }

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        aria-label="Row actions"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => { setOpen(false); setConfirming(null); }} />
          <div className="absolute right-0 z-20 mt-1 w-56 rounded-[var(--radius-md)] border border-rule bg-paper-raised py-1 shadow-lg">
            {confirming === null && (
              <>
                {isDraft && (
                  <Link
                    href={`/invoices/${invoiceId}/edit`}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <Pencil size={14} /> Edit draft
                  </Link>
                )}
                {isDraft ? (
                  <button
                    onClick={() => setConfirming("delete")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-negative-600 hover:bg-negative-100"
                  >
                    <Trash2 size={14} /> Delete draft
                  </button>
                ) : (
                  <button
                    onClick={() => setConfirming("cancel")}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-negative-600 hover:bg-negative-100"
                  >
                    <Ban size={14} /> Cancel invoice
                  </button>
                )}
              </>
            )}

            {confirming === "delete" && (
              <div className="px-3 py-2">
                <p className="text-xs text-ink-600">Permanently delete this draft? This can&apos;t be undone.</p>
                {error && <p className="mt-1 text-xs text-negative-600">{error}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="rounded-[var(--radius-sm)] bg-negative-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-negative-700"
                  >
                    {isPending ? "Deleting…" : "Delete"}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {confirming === "cancel" && (
              <div className="px-3 py-2">
                <p className="text-xs text-ink-600">
                  This reverses the ledger entry and marks the invoice as cancelled. The original stays visible in
                  the Journal for your records.
                </p>
                {error && <p className="mt-1 text-xs text-negative-600">{error}</p>}
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={handleCancel}
                    disabled={isPending}
                    className="rounded-[var(--radius-sm)] bg-negative-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-negative-700"
                  >
                    {isPending ? "Cancelling…" : "Cancel Invoice"}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-[var(--radius-sm)] px-2.5 py-1 text-xs text-ink-500 hover:bg-ink-100"
                  >
                    Back
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
