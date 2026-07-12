-- ============================================================================
-- Adds a signature image field to tenants, and sets up a Supabase Storage
-- bucket for firm branding assets (logo + signature images used on invoices).
-- ============================================================================

alter table tenants add column if not exists signature_url text;

-- Public bucket: invoice PDFs/print views need to display these images to
-- anyone with an invoice link, so the assets themselves are public, but
-- only writable by the app's server (via the service role key, which
-- bypasses storage RLS entirely — see lib/storage/upload.ts).
insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do nothing;

-- Allow public read access to the bucket's objects (needed so invoice
-- print views / PDFs render the logo and signature for anyone with the link).
drop policy if exists "Public read access to brand assets" on storage.objects;
create policy "Public read access to brand assets"
  on storage.objects for select
  using (bucket_id = 'brand-assets');

-- No insert/update/delete policy is created for authenticated/anon roles —
-- uploads only happen server-side through the service role key, which
-- bypasses RLS by design. This keeps the bucket read-only from the browser.
