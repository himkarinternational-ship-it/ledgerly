-- ============================================================================
-- Seed: Himkar International tenant + standard chart of accounts
-- Edit the tenant details (GSTIN, PAN, address, state) before running in
-- production — placeholders below must be replaced with real values.
-- ============================================================================

insert into tenants (
  id, name, slug, business_type, pan, gstin, tan, udyam_number,
  address_line1, city, state, state_code, pincode, financial_year_start_month
) values (
  '00000000-0000-0000-0000-000000000001',
  'Himkar International',
  'himkar-international',
  'partnership',
  'REPLACE_WITH_PAN',
  'REPLACE_WITH_GSTIN',
  'REPLACE_WITH_TAN',
  'UDYAM-RJ-33-0098000',
  'REPLACE_WITH_ADDRESS',
  'REPLACE_WITH_CITY',
  'Rajasthan',
  '08',
  'REPLACE_WITH_PINCODE',
  4
)
on conflict (id) do nothing;

-- Standard Chart of Accounts -------------------------------------------------
-- Numbering convention: 1xxx Assets, 2xxx Liabilities, 3xxx Equity,
-- 4xxx Income, 5xxx Expenses

with t as (select '00000000-0000-0000-0000-000000000001'::uuid as id)
insert into accounts (tenant_id, code, name, account_type, account_subtype, is_system, is_cash_account, is_bank_account)
select t.id, code, name, account_type, subtype, is_system, is_cash, is_bank
from t, (values
  -- Assets
  ('1000','Cash in Hand','asset','current_asset', false, true, false),
  ('1010','Bank Account — Primary','asset','bank', false, false, true),
  ('1100','Accounts Receivable','asset','receivable', true, false, false),
  ('1200','Input GST (CGST)','asset','tax_asset', true, false, false),
  ('1201','Input GST (SGST)','asset','tax_asset', true, false, false),
  ('1202','Input GST (IGST)','asset','tax_asset', true, false, false),
  ('1300','TDS Receivable','asset','tax_asset', true, false, false),
  ('1400','Prepaid Expenses','asset','current_asset', false, false, false),
  ('1500','Fixed Assets — Office Equipment','asset','fixed_asset', false, false, false),
  ('1510','Fixed Assets — Furniture & Fixtures','asset','fixed_asset', false, false, false),
  ('1600','Accumulated Depreciation','asset','contra_asset', false, false, false),

  -- Liabilities
  ('2000','Accounts Payable','liability','payable', true, false, false),
  ('2100','Output GST (CGST)','liability','tax_liability', true, false, false),
  ('2101','Output GST (SGST)','liability','tax_liability', true, false, false),
  ('2102','Output GST (IGST)','liability','tax_liability', true, false, false),
  ('2200','TDS Payable','liability','tax_liability', true, false, false),
  ('2300','GST Payable (Net)','liability','tax_liability', true, false, false),
  ('2400','Salaries Payable','liability','current_liability', false, false, false),
  ('2500','Other Current Liabilities','liability','current_liability', false, false, false),

  -- Equity / Partner Accounts (individual partner capital/current accounts are added dynamically)
  ('3000','Partners'' Capital — Pool','equity','partner_capital', false, false, false),
  ('3100','Partners'' Current — Pool','equity','partner_current', false, false, false),
  ('3900','Retained Earnings','equity','retained_earnings', true, false, false),

  -- Income
  ('4000','Sales — Services','income','operating_income', false, false, false),
  ('4010','Sales — Goods','income','operating_income', false, false, false),
  ('4100','Export Income','income','operating_income', false, false, false),
  ('4900','Other Income','income','other_income', false, false, false),

  -- Expenses
  ('5000','Cost of Goods Sold','expense','cogs', false, false, false),
  ('5100','Salaries & Wages','expense','operating_expense', false, false, false),
  ('5110','Partner Remuneration','expense','operating_expense', false, false, false),
  ('5120','Interest on Partner Capital','expense','operating_expense', false, false, false),
  ('5200','Rent Expense','expense','operating_expense', false, false, false),
  ('5210','Electricity & Utilities','expense','operating_expense', false, false, false),
  ('5300','Professional Fees','expense','operating_expense', false, false, false),
  ('5310','Legal & Consulting','expense','operating_expense', false, false, false),
  ('5400','Office Supplies','expense','operating_expense', false, false, false),
  ('5410','Software & Subscriptions','expense','operating_expense', false, false, false),
  ('5500','Travel & Conveyance','expense','operating_expense', false, false, false),
  ('5510','Communication (Phone/Internet)','expense','operating_expense', false, false, false),
  ('5600','Bank Charges','expense','operating_expense', false, false, false),
  ('5700','Depreciation','expense','operating_expense', false, false, false),
  ('5800','Marketing & Advertising','expense','operating_expense', false, false, false),
  ('5900','Miscellaneous Expenses','expense','operating_expense', false, false, false)
) as coa(code, name, account_type, subtype, is_system, is_cash, is_bank)
on conflict (tenant_id, code) do nothing;
