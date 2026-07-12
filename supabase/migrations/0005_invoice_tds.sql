-- ============================================================================
-- Adds TDS (Tax Deducted at Source) support to outward invoices.
-- Common for professional/consulting fees, where the client deducts TDS
-- under a section like 194J before paying — the invoice total stays the
-- gross billed amount, but the amount actually receivable is net of TDS.
-- ============================================================================

alter table invoices add column if not exists tds_applicable boolean default false;
alter table invoices add column if not exists tds_section text;
alter table invoices add column if not exists tds_rate numeric(5,2) default 0;
alter table invoices add column if not exists tds_amount numeric(15,2) default 0;
