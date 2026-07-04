import type { SupabaseClient } from "@supabase/supabase-js";
import { money, round2 } from "@/lib/accounting/money";
import type { AccountType } from "@/lib/supabase/types";

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  name: string;
  accountType: AccountType;
  debit: number;
  credit: number;
}

/**
 * Computes the trial balance as of a given date by summing all posted
 * journal entry lines up to (and including) that date, plus each account's
 * opening balance. This is the base every other report derives from.
 */
export async function getTrialBalance(
  supabase: SupabaseClient,
  tenantId: string,
  asOfDate: string,
  fromDate?: string
): Promise<TrialBalanceRow[]> {
  const { data: accounts, error: acctErr } = await supabase
    .from("accounts")
    .select("id, code, name, account_type, opening_balance, opening_balance_date")
    .eq("tenant_id", tenantId)
    .eq("is_active", true)
    .order("code");
  if (acctErr) throw acctErr;

  let query = supabase
    .from("journal_entry_lines")
    .select("account_id, debit, credit, journal_entries!inner(tenant_id, date)")
    .eq("journal_entries.tenant_id", tenantId)
    .lte("journal_entries.date", asOfDate);

  if (fromDate) {
    query = query.gte("journal_entries.date", fromDate);
  }

  const { data: lines, error: linesErr } = await query;
  if (linesErr) throw linesErr;

  const totals = new Map<string, { debit: import("decimal.js").default; credit: import("decimal.js").default }>();

  for (const line of lines ?? []) {
    const key = line.account_id as string;
    const existing = totals.get(key) ?? { debit: money(0), credit: money(0) };
    existing.debit = existing.debit.plus(line.debit ?? 0);
    existing.credit = existing.credit.plus(line.credit ?? 0);
    totals.set(key, existing);
  }

  const rows: TrialBalanceRow[] = [];

  for (const acct of accounts ?? []) {
    const t = totals.get(acct.id) ?? { debit: money(0), credit: money(0) };
    let debit = t.debit;
    let credit = t.credit;

    // Fold in opening balance, respecting normal balance side per account type
    const opening = money(acct.opening_balance ?? 0);
    if (opening.gt(0)) {
      const normalDebitSide = acct.account_type === "asset" || acct.account_type === "expense";
      if (!fromDate || (acct.opening_balance_date && acct.opening_balance_date <= asOfDate)) {
        if (normalDebitSide) debit = debit.plus(opening);
        else credit = credit.plus(opening);
      }
    }

    const net = debit.minus(credit);
    if (net.eq(0) && debit.eq(0) && credit.eq(0)) continue; // skip untouched accounts

    rows.push({
      accountId: acct.id,
      code: acct.code,
      name: acct.name,
      accountType: acct.account_type,
      debit: net.gt(0) ? round2(net) : 0,
      credit: net.lt(0) ? round2(net.abs()) : 0,
    });
  }

  return rows;
}

export interface ProfitAndLoss {
  periodStart: string;
  periodEnd: string;
  income: { code: string; name: string; amount: number }[];
  totalIncome: number;
  expenses: { code: string; name: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
}

export async function getProfitAndLoss(
  supabase: SupabaseClient,
  tenantId: string,
  periodStart: string,
  periodEnd: string
): Promise<ProfitAndLoss> {
  const rows = await getTrialBalance(supabase, tenantId, periodEnd, periodStart);

  const income = rows
    .filter((r) => r.accountType === "income")
    .map((r) => ({ code: r.code, name: r.name, amount: round2(money(r.credit).minus(r.debit)) }));

  const expenses = rows
    .filter((r) => r.accountType === "expense")
    .map((r) => ({ code: r.code, name: r.name, amount: round2(money(r.debit).minus(r.credit)) }));

  const totalIncome = round2(income.reduce((sum, r) => sum.plus(r.amount), money(0)));
  const totalExpenses = round2(expenses.reduce((sum, r) => sum.plus(r.amount), money(0)));

  return {
    periodStart,
    periodEnd,
    income,
    totalIncome,
    expenses,
    totalExpenses,
    netProfit: round2(money(totalIncome).minus(totalExpenses)),
  };
}

export interface BalanceSheet {
  asOfDate: string;
  assets: { code: string; name: string; amount: number }[];
  totalAssets: number;
  liabilities: { code: string; name: string; amount: number }[];
  totalLiabilities: number;
  equity: { code: string; name: string; amount: number }[];
  currentYearEarnings: number;
  totalEquity: number;
  totalLiabilitiesAndEquity: number;
  isBalanced: boolean;
}

export async function getBalanceSheet(
  supabase: SupabaseClient,
  tenantId: string,
  asOfDate: string,
  financialYearStart: string
): Promise<BalanceSheet> {
  const rows = await getTrialBalance(supabase, tenantId, asOfDate);
  const pl = await getProfitAndLoss(supabase, tenantId, financialYearStart, asOfDate);

  const assets = rows
    .filter((r) => r.accountType === "asset")
    .map((r) => ({ code: r.code, name: r.name, amount: round2(money(r.debit).minus(r.credit)) }));

  const liabilities = rows
    .filter((r) => r.accountType === "liability")
    .map((r) => ({ code: r.code, name: r.name, amount: round2(money(r.credit).minus(r.debit)) }));

  const equity = rows
    .filter((r) => r.accountType === "equity")
    .map((r) => ({ code: r.code, name: r.name, amount: round2(money(r.credit).minus(r.debit)) }));

  const totalAssets = round2(assets.reduce((sum, r) => sum.plus(r.amount), money(0)));
  const totalLiabilities = round2(liabilities.reduce((sum, r) => sum.plus(r.amount), money(0)));
  const totalEquityExclEarnings = round2(equity.reduce((sum, r) => sum.plus(r.amount), money(0)));
  const totalEquity = round2(money(totalEquityExclEarnings).plus(pl.netProfit));

  const totalLiabilitiesAndEquity = round2(money(totalLiabilities).plus(totalEquity));

  return {
    asOfDate,
    assets,
    totalAssets,
    liabilities,
    totalLiabilities,
    equity,
    currentYearEarnings: pl.netProfit,
    totalEquity,
    totalLiabilitiesAndEquity,
    isBalanced: Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01,
  };
}
