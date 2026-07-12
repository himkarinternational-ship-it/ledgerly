// Hand-authored types matching supabase/migrations/0001_init.sql.
// If you have the Supabase CLI, prefer generating this with:
//   supabase gen types typescript --project-id <id> > lib/supabase/types.ts

export type BusinessType =
  | "proprietorship" | "partnership" | "llp" | "pvt_ltd" | "opc" | "huf" | "trust";

export type AccountType = "asset" | "liability" | "equity" | "income" | "expense";

export type InvoiceType =
  | "tax_invoice" | "bill_of_supply" | "export" | "proforma" | "credit_note" | "debit_note";

export type InvoiceStatus =
  | "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue" | "cancelled";

export type SupplyType = "intra_state" | "inter_state" | "export" | "import";

export type ContactType = "client" | "vendor" | "both";

export type PartnerTxnType =
  | "capital_introduced" | "capital_withdrawn" | "drawings" | "remuneration"
  | "interest_on_capital" | "interest_on_drawings" | "profit_share"
  | "loan_given" | "loan_repaid";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  business_type: BusinessType;
  pan: string | null;
  gstin: string | null;
  tan: string | null;
  udyam_number: string | null;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  state_code: string | null;
  pincode: string | null;
  financial_year_start_month: number;
  base_currency: string;
  logo_url: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Account {
  id: string;
  tenant_id: string;
  code: string;
  name: string;
  account_type: AccountType;
  account_subtype: string | null;
  parent_id: string | null;
  is_bank_account: boolean;
  is_cash_account: boolean;
  is_system: boolean;
  opening_balance: number;
  opening_balance_date: string | null;
  gst_applicable: boolean;
  gst_rate: number | null;
  hsn_sac_code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Contact {
  id: string;
  tenant_id: string;
  contact_type: ContactType;
  name: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  gstin: string | null;
  pan: string | null;
  is_registered_gst: boolean;
  billing_address_line1: string | null;
  billing_address_line2: string | null;
  billing_city: string | null;
  billing_state: string | null;
  billing_state_code: string | null;
  billing_pincode: string | null;
  billing_country: string;
  payment_terms_days: number;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Item {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  item_type: "goods" | "service";
  hsn_sac_code: string | null;
  unit: string;
  default_rate: number;
  gst_rate: number;
  income_account_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BankAccount {
  id: string;
  tenant_id: string;
  account_id: string | null;
  bank_name: string;
  account_number: string;
  ifsc_code: string | null;
  branch: string | null;
  account_type: "current" | "savings" | "overdraft" | "cash_credit" | null;
  opening_balance: number;
  current_balance: number;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  client_id: string | null;
  issue_date: string;
  due_date: string | null;
  place_of_supply_state: string | null;
  place_of_supply_state_code: string | null;
  supply_type: SupplyType | null;
  reverse_charge: boolean;
  subtotal: number;
  discount_total: number;
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  cess_amount: number;
  round_off: number;
  total_amount: number;
  amount_paid: number;
  currency: string;
  status: InvoiceStatus;
  payment_terms: string | null;
  notes: string | null;
  terms_and_conditions: string | null;
  bank_account_id: string | null;
  linked_invoice_id: string | null;
  tds_applicable: boolean;
  tds_section: string | null;
  tds_rate: number;
  tds_amount: number;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_id: string | null;
  description: string;
  hsn_sac_code: string | null;
  quantity: number;
  unit: string | null;
  rate: number;
  discount_percent: number;
  discount_amount: number;
  taxable_value: number;
  gst_rate: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface Expense {
  id: string;
  tenant_id: string;
  expense_number: string | null;
  vendor_id: string | null;
  category_account_id: string | null;
  date: string;
  amount: number;
  taxable_value: number | null;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  gst_rate: number;
  is_itc_eligible: boolean;
  tds_applicable: boolean;
  tds_section: string | null;
  tds_rate: number;
  tds_amount: number;
  payment_mode: "bank" | "cash" | "upi" | "card" | "cheque" | "other" | null;
  bank_account_id: string | null;
  reference_number: string | null;
  description: string | null;
  receipt_url: string | null;
  status: "draft" | "recorded" | "paid";
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  tenant_id: string;
  entry_number: string;
  date: string;
  narration: string;
  reference_type: string | null;
  reference_id: string | null;
  total_debit: number;
  total_credit: number;
  is_auto_generated: boolean;
  created_by: string | null;
  created_at: string;
}

export interface JournalEntryLine {
  id: string;
  journal_entry_id: string;
  account_id: string;
  debit: number;
  credit: number;
  description: string | null;
  sort_order: number;
}

export interface Partner {
  id: string;
  tenant_id: string;
  name: string;
  pan: string | null;
  is_working_partner: boolean;
  profit_share_percent: number;
  capital_account_id: string | null;
  current_account_id: string | null;
  loan_account_id: string | null;
  interest_on_capital_rate: number;
  interest_on_drawings_rate: number;
  is_active: boolean;
  joined_date: string | null;
  created_at: string;
}

export interface PartnerTransaction {
  id: string;
  tenant_id: string;
  partner_id: string;
  txn_type: PartnerTxnType;
  date: string;
  amount: number;
  financial_year: string | null;
  description: string | null;
  journal_entry_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface RemunerationCalculation {
  id: string;
  tenant_id: string;
  financial_year: string;
  net_profit_as_per_pl: number;
  add_back_remuneration: number;
  add_back_partner_interest: number;
  add_back_disallowed_expenses: number;
  book_profit: number;
  max_allowable_remuneration: number;
  actual_remuneration_paid: number;
  calculation_breakdown: Record<string, unknown>;
  created_at: string;
}

export interface GstReturn {
  id: string;
  tenant_id: string;
  return_type: "GSTR-1" | "GSTR-3B";
  period: string;
  status: "draft" | "ready" | "filed";
  computed_data: Record<string, unknown>;
  filed_date: string | null;
  acknowledgement_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface ComplianceEvent {
  id: string;
  tenant_id: string;
  event_type: string;
  title: string;
  description: string | null;
  due_date: string;
  status: "pending" | "completed" | "overdue";
  completed_at: string | null;
  created_at: string;
}

// Minimal Database type so @supabase/ssr generics are satisfied.
// Extend with full generated types when convenient.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
