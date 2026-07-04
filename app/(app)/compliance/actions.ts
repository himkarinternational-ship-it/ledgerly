"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Generates the standard recurring GST/TDS/advance-tax due dates for the
 * next 12 months. Idempotent-ish: re-running will create duplicates if
 * called twice for the same period, so this is meant as a one-time seed
 * per year, triggered manually by the user.
 */
export async function seedComplianceCalendar(tenantId: string) {
  const supabase = await createClient();
  const events: { tenant_id: string; event_type: string; title: string; due_date: string; description: string }[] = [];

  const today = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    const monthLabel = d.toLocaleString("en-IN", { month: "long", year: "numeric" });

    // GSTR-3B: 20th of following month
    const gstr3bDue = new Date(d.getFullYear(), d.getMonth() + 1, 20);
    events.push({
      tenant_id: tenantId,
      event_type: "GSTR-3B",
      title: `GSTR-3B for ${monthLabel}`,
      due_date: gstr3bDue.toISOString().slice(0, 10),
      description: "Monthly summary GST return",
    });

    // GSTR-1: 11th of following month
    const gstr1Due = new Date(d.getFullYear(), d.getMonth() + 1, 11);
    events.push({
      tenant_id: tenantId,
      event_type: "GSTR-1",
      title: `GSTR-1 for ${monthLabel}`,
      due_date: gstr1Due.toISOString().slice(0, 10),
      description: "Outward supplies return",
    });

    // TDS payment: 7th of following month
    const tdsDue = new Date(d.getFullYear(), d.getMonth() + 1, 7);
    events.push({
      tenant_id: tenantId,
      event_type: "TDS_PAYMENT",
      title: `TDS Payment for ${monthLabel}`,
      due_date: tdsDue.toISOString().slice(0, 10),
      description: "Deposit TDS deducted during the month",
    });
  }

  // Quarterly TDS returns (26Q) — 31 Jul, 31 Oct, 31 Jan, 31 May
  const year = today.getFullYear();
  const quarterlyDates = [
    { date: `${year}-07-31`, label: "Q1 (Apr-Jun)" },
    { date: `${year}-10-31`, label: "Q2 (Jul-Sep)" },
    { date: `${year + 1}-01-31`, label: "Q3 (Oct-Dec)" },
    { date: `${year + 1}-05-31`, label: "Q4 (Jan-Mar)" },
  ];
  for (const q of quarterlyDates) {
    events.push({
      tenant_id: tenantId,
      event_type: "TDS_26Q",
      title: `TDS Return 26Q — ${q.label}`,
      due_date: q.date,
      description: "Quarterly non-salary TDS return",
    });
  }

  const { error } = await supabase.from("compliance_events").insert(events);
  if (error) return { error: error.message };

  revalidatePath("/compliance");
  return { success: true, count: events.length };
}
