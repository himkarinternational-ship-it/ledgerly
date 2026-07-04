-- ============================================================================
-- Row Level Security
-- Model: every table with tenant_id is locked to tenants the requesting
-- auth user belongs to, via the tenant_users membership table.
-- The app uses the Supabase service role for server-side operations
-- (via server-only Supabase client), so these policies primarily protect
-- against any future direct client-side access.
-- ============================================================================

create or replace function auth_user_tenant_ids()
returns setof uuid
language sql
security definer
stable
as $$
  select tu.tenant_id
  from tenant_users tu
  join app_users au on au.id = tu.user_id
  where au.auth_user_id = auth.uid()
    and tu.is_active = true;
$$;

-- Helper macro-ish approach: enable RLS + one policy per table
do $$
declare
  tbl text;
  tenant_tables text[] := array[
    'accounts','contacts','items','bank_accounts','invoices','expenses',
    'journal_entries','partners','partner_transactions',
    'remuneration_calculations','gst_returns','compliance_events','audit_logs'
  ];
begin
  foreach tbl in array tenant_tables loop
    execute format('alter table %I enable row level security;', tbl);
    execute format(
      'create policy tenant_isolation_%1$s on %1$s
         for all
         using (tenant_id in (select auth_user_tenant_ids()))
         with check (tenant_id in (select auth_user_tenant_ids()));',
      tbl
    );
  end loop;
end $$;

-- Child tables without their own tenant_id inherit access via parent
alter table invoice_items enable row level security;
create policy invoice_items_via_invoice on invoice_items
  for all
  using (invoice_id in (select id from invoices))
  with check (invoice_id in (select id from invoices));

alter table journal_entry_lines enable row level security;
create policy jel_via_entry on journal_entry_lines
  for all
  using (journal_entry_id in (select id from journal_entries))
  with check (journal_entry_id in (select id from journal_entries));

alter table tenants enable row level security;
create policy tenants_membership on tenants
  for all
  using (id in (select auth_user_tenant_ids()))
  with check (id in (select auth_user_tenant_ids()));

alter table tenant_users enable row level security;
create policy tenant_users_membership on tenant_users
  for all
  using (tenant_id in (select auth_user_tenant_ids()));

alter table app_users enable row level security;
create policy app_users_self on app_users
  for all
  using (auth_user_id = auth.uid());
