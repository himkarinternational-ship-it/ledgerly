-- ============================================================================
-- Ledgerly — Initial Schema
-- Single-tenant deployment for Himkar International, built tenant-aware
-- so a second tenant can be added later without a redesign.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tenants & Users
-- ----------------------------------------------------------------------------

create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  business_type text not null check (business_type in
    ('proprietorship','partnership','llp','pvt_ltd','opc','huf','trust')),
  pan text,
  gstin text,
  tan text,
  udyam_number text,
  address_line1 text,
  address_line2 text,
  city text,
  state text,
  state_code text,          -- 2-digit GST state code, e.g. '08' for Rajasthan
  pincode text,
  financial_year_start_month int not null default 4, -- April
  base_currency text not null default 'INR',
  logo_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table app_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique, -- maps to supabase auth.users.id
  email text unique not null,
  name text not null,
  phone text,
  created_at timestamptz default now()
);

create table tenant_users (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  role text not null check (role in ('admin','partner','accountant','auditor','viewer')),
  is_active boolean default true,
  joined_at timestamptz default now(),
  unique(tenant_id, user_id)
);

-- ----------------------------------------------------------------------------
-- Chart of Accounts
-- ----------------------------------------------------------------------------

create table accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code text not null,
  name text not null,
  account_type text not null check (account_type in
    ('asset','liability','equity','income','expense')),
  account_subtype text, -- e.g. 'current_asset','fixed_asset','bank','cash','payable','receivable'
  parent_id uuid references accounts(id),
  is_bank_account boolean default false,
  is_cash_account boolean default false,
  is_system boolean default false, -- protected accounts (retained earnings, etc.)
  opening_balance numeric(15,2) default 0,
  opening_balance_date date,
  gst_applicable boolean default false,
  gst_rate numeric(5,2),
  hsn_sac_code text,
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(tenant_id, code)
);

create index idx_accounts_tenant on accounts(tenant_id);
create index idx_accounts_type on accounts(tenant_id, account_type);

-- ----------------------------------------------------------------------------
-- Contacts: Clients & Vendors (unified table, flagged by type)
-- ----------------------------------------------------------------------------

create table contacts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  contact_type text not null check (contact_type in ('client','vendor','both')),
  name text not null,
  display_name text,
  email text,
  phone text,
  gstin text,
  pan text,
  is_registered_gst boolean default false,
  billing_address_line1 text,
  billing_address_line2 text,
  billing_city text,
  billing_state text,
  billing_state_code text,
  billing_pincode text,
  billing_country text default 'India',
  shipping_same_as_billing boolean default true,
  shipping_address_line1 text,
  shipping_city text,
  shipping_state text,
  shipping_state_code text,
  shipping_pincode text,
  payment_terms_days int default 30,
  notes text,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_contacts_tenant on contacts(tenant_id);
create index idx_contacts_type on contacts(tenant_id, contact_type);

-- ----------------------------------------------------------------------------
-- Items (products/services catalog)
-- ----------------------------------------------------------------------------

create table items (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  description text,
  item_type text not null check (item_type in ('goods','service')),
  hsn_sac_code text,
  unit text default 'unit',
  default_rate numeric(15,2) default 0,
  gst_rate numeric(5,2) default 0,
  income_account_id uuid references accounts(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_items_tenant on items(tenant_id);

-- ----------------------------------------------------------------------------
-- Bank Accounts
-- ----------------------------------------------------------------------------

create table bank_accounts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  account_id uuid references accounts(id), -- linked ledger account
  bank_name text not null,
  account_number text not null,
  ifsc_code text,
  branch text,
  account_type text check (account_type in ('current','savings','overdraft','cash_credit')),
  opening_balance numeric(15,2) default 0,
  current_balance numeric(15,2) default 0,
  is_primary boolean default false,
  is_active boolean default true,
  created_at timestamptz default now()
);

create index idx_bank_accounts_tenant on bank_accounts(tenant_id);

-- ----------------------------------------------------------------------------
-- Invoices
-- ----------------------------------------------------------------------------

create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  invoice_number text not null,
  invoice_type text not null default 'tax_invoice' check (invoice_type in
    ('tax_invoice','bill_of_supply','export','proforma','credit_note','debit_note')),
  client_id uuid references contacts(id),
  issue_date date not null default current_date,
  due_date date,
  place_of_supply_state text,
  place_of_supply_state_code text,
  supply_type text check (supply_type in ('intra_state','inter_state','export','import')),
  reverse_charge boolean default false,
  subtotal numeric(15,2) not null default 0,
  discount_total numeric(15,2) default 0,
  taxable_value numeric(15,2) not null default 0,
  cgst_amount numeric(15,2) default 0,
  sgst_amount numeric(15,2) default 0,
  igst_amount numeric(15,2) default 0,
  cess_amount numeric(15,2) default 0,
  round_off numeric(15,2) default 0,
  total_amount numeric(15,2) not null default 0,
  amount_paid numeric(15,2) not null default 0,
  currency text default 'INR',
  status text not null default 'draft' check (status in
    ('draft','sent','viewed','partially_paid','paid','overdue','cancelled')),
  payment_terms text,
  notes text,
  terms_and_conditions text,
  bank_account_id uuid references bank_accounts(id),
  linked_invoice_id uuid references invoices(id), -- for credit/debit notes
  journal_entry_id uuid, -- fk added after journal_entries created
  created_by uuid references app_users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, invoice_number)
);

create index idx_invoices_tenant on invoices(tenant_id);
create index idx_invoices_client on invoices(client_id);
create index idx_invoices_status on invoices(tenant_id, status);
create index idx_invoices_date on invoices(tenant_id, issue_date);

create table invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  item_id uuid references items(id),
  description text not null,
  hsn_sac_code text,
  quantity numeric(10,3) not null default 1,
  unit text,
  rate numeric(15,2) not null default 0,
  discount_percent numeric(5,2) default 0,
  discount_amount numeric(15,2) default 0,
  taxable_value numeric(15,2) not null default 0,
  gst_rate numeric(5,2) default 0,
  cgst_amount numeric(15,2) default 0,
  sgst_amount numeric(15,2) default 0,
  igst_amount numeric(15,2) default 0,
  total_amount numeric(15,2) not null default 0,
  sort_order int default 0
);

create index idx_invoice_items_invoice on invoice_items(invoice_id);

-- ----------------------------------------------------------------------------
-- Expenses
-- ----------------------------------------------------------------------------

create table expenses (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  expense_number text,
  vendor_id uuid references contacts(id),
  category_account_id uuid references accounts(id),
  date date not null default current_date,
  amount numeric(15,2) not null,
  taxable_value numeric(15,2),
  cgst_amount numeric(15,2) default 0,
  sgst_amount numeric(15,2) default 0,
  igst_amount numeric(15,2) default 0,
  gst_rate numeric(5,2) default 0,
  is_itc_eligible boolean default true,
  tds_applicable boolean default false,
  tds_section text,
  tds_rate numeric(5,2) default 0,
  tds_amount numeric(15,2) default 0,
  payment_mode text check (payment_mode in ('bank','cash','upi','card','cheque','other')),
  bank_account_id uuid references bank_accounts(id),
  reference_number text,
  description text,
  receipt_url text,
  status text default 'recorded' check (status in ('draft','recorded','paid')),
  journal_entry_id uuid,
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

create index idx_expenses_tenant on expenses(tenant_id);
create index idx_expenses_date on expenses(tenant_id, date);
create index idx_expenses_vendor on expenses(vendor_id);

-- ----------------------------------------------------------------------------
-- Journal Entries (double-entry core — everything ultimately posts here)
-- ----------------------------------------------------------------------------

create table journal_entries (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  entry_number text not null,
  date date not null default current_date,
  narration text not null,
  reference_type text, -- 'invoice','expense','payment','manual','partner_txn'
  reference_id uuid,
  total_debit numeric(15,2) not null default 0,
  total_credit numeric(15,2) not null default 0,
  is_auto_generated boolean default false,
  created_by uuid references app_users(id),
  created_at timestamptz default now(),
  unique(tenant_id, entry_number),
  constraint balanced_entry check (total_debit = total_credit)
);

create index idx_je_tenant on journal_entries(tenant_id);
create index idx_je_date on journal_entries(tenant_id, date);
create index idx_je_reference on journal_entries(reference_type, reference_id);

create table journal_entry_lines (
  id uuid primary key default gen_random_uuid(),
  journal_entry_id uuid not null references journal_entries(id) on delete cascade,
  account_id uuid not null references accounts(id),
  debit numeric(15,2) not null default 0,
  credit numeric(15,2) not null default 0,
  description text,
  sort_order int default 0,
  constraint one_sided check (not (debit > 0 and credit > 0))
);

create index idx_jel_entry on journal_entry_lines(journal_entry_id);
create index idx_jel_account on journal_entry_lines(account_id);

alter table invoices add constraint fk_invoice_journal
  foreign key (journal_entry_id) references journal_entries(id);
alter table expenses add constraint fk_expense_journal
  foreign key (journal_entry_id) references journal_entries(id);

-- ----------------------------------------------------------------------------
-- Partners & Partnership Accounting
-- ----------------------------------------------------------------------------

create table partners (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  pan text,
  is_working_partner boolean default true,
  profit_share_percent numeric(5,2) not null default 0,
  capital_account_id uuid references accounts(id),
  current_account_id uuid references accounts(id),
  loan_account_id uuid references accounts(id),
  interest_on_capital_rate numeric(5,2) default 12.0,
  interest_on_drawings_rate numeric(5,2) default 0,
  is_active boolean default true,
  joined_date date,
  created_at timestamptz default now()
);

create index idx_partners_tenant on partners(tenant_id);

-- Ledger of partner-specific transactions (capital in/out, drawings, remuneration, interest)
create table partner_transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  partner_id uuid not null references partners(id) on delete cascade,
  txn_type text not null check (txn_type in
    ('capital_introduced','capital_withdrawn','drawings','remuneration',
     'interest_on_capital','interest_on_drawings','profit_share','loan_given','loan_repaid')),
  date date not null default current_date,
  amount numeric(15,2) not null,
  financial_year text, -- e.g. '2026-27'
  description text,
  journal_entry_id uuid references journal_entries(id),
  created_by uuid references app_users(id),
  created_at timestamptz default now()
);

create index idx_ptxn_tenant on partner_transactions(tenant_id);
create index idx_ptxn_partner on partner_transactions(partner_id);
create index idx_ptxn_fy on partner_transactions(tenant_id, financial_year);

-- Stores computed Section 40(b) remuneration workings per financial year, for audit trail
create table remuneration_calculations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  financial_year text not null,
  net_profit_as_per_pl numeric(15,2) not null,
  add_back_remuneration numeric(15,2) not null default 0,
  add_back_partner_interest numeric(15,2) not null default 0,
  add_back_disallowed_expenses numeric(15,2) not null default 0,
  book_profit numeric(15,2) not null,
  max_allowable_remuneration numeric(15,2) not null,
  actual_remuneration_paid numeric(15,2) not null default 0,
  calculation_breakdown jsonb not null default '{}',
  created_at timestamptz default now(),
  unique(tenant_id, financial_year)
);

-- ----------------------------------------------------------------------------
-- GST Returns (computed summaries, exportable)
-- ----------------------------------------------------------------------------

create table gst_returns (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  return_type text not null check (return_type in ('GSTR-1','GSTR-3B')),
  period text not null, -- 'MM-YYYY'
  status text default 'draft' check (status in ('draft','ready','filed')),
  computed_data jsonb not null default '{}',
  filed_date date,
  acknowledgement_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(tenant_id, return_type, period)
);

-- ----------------------------------------------------------------------------
-- Compliance Calendar
-- ----------------------------------------------------------------------------

create table compliance_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  event_type text not null, -- 'GSTR-1','GSTR-3B','TDS_24Q','ADVANCE_TAX', etc.
  title text not null,
  description text,
  due_date date not null,
  status text default 'pending' check (status in ('pending','completed','overdue')),
  completed_at timestamptz,
  created_at timestamptz default now()
);

create index idx_compliance_tenant on compliance_events(tenant_id, due_date);

-- ----------------------------------------------------------------------------
-- Audit Log
-- ----------------------------------------------------------------------------

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references tenants(id) on delete cascade,
  user_id uuid references app_users(id),
  action text not null,       -- 'create','update','delete'
  table_name text not null,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  created_at timestamptz default now()
);

create index idx_audit_tenant on audit_logs(tenant_id, created_at desc);

-- ----------------------------------------------------------------------------
-- updated_at trigger helper
-- ----------------------------------------------------------------------------

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_tenants_updated before update on tenants
  for each row execute function set_updated_at();
create trigger trg_invoices_updated before update on invoices
  for each row execute function set_updated_at();
create trigger trg_gst_returns_updated before update on gst_returns
  for each row execute function set_updated_at();
