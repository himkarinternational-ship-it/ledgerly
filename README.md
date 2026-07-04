# Ledgerly

Cloud accounting for Himkar International — invoicing, expenses, GST returns
(GSTR-1 / GSTR-3B), partnership accounting with Section 40(b) remuneration,
and financial reports. Built single-tenant for now, but every table carries
`tenant_id` so it can extend to multiple firms later without a schema rewrite.

## Stack

- **Next.js 15** (App Router, Server Components, Server Actions)
- **Supabase** (Postgres + Auth + Row-Level Security)
- **Tailwind CSS v4** with a hand-built design token system
- **Decimal.js** for all money math (no floating-point rounding errors)
- **Zod** for input validation on every server action

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com) (choose the
   **Mumbai (ap-south-1)** region for data residency).
2. In the SQL Editor, run the three migration files **in order**:
   - `supabase/migrations/0001_init.sql` — tables
   - `supabase/migrations/0002_rls.sql` — row-level security policies
   - `supabase/migrations/0003_seed.sql` — Himkar International tenant + chart of accounts
     - **Before running this one**, edit the placeholder values (PAN, GSTIN,
       TAN, address, state, pincode) at the top of the file with your real details.
3. In **Authentication → Providers**, make sure Email is enabled.
4. In **Authentication → Users**, create your first user (yourself).
5. Link that auth user to the app:
   ```sql
   insert into app_users (auth_user_id, email, name)
   values ('<auth-user-uuid-from-step-4>', 'you@himkar.com', 'Your Name');

   insert into tenant_users (tenant_id, user_id, role)
   values (
     '00000000-0000-0000-0000-000000000001', -- Himkar International tenant id
     (select id from app_users where email = 'you@himkar.com'),
     'admin'
   );
   ```
6. Copy your project's **Project URL**, **anon public key**, and **service
   role key** from Settings → API — you'll need them below.

## 2. Run locally

```bash
npm install
cp .env.example .env.local
# fill in .env.local with the values from Supabase Settings > API
npm run dev
```

Visit `http://localhost:3000`, sign in with the user you created above.

## 3. Deploy to Vercel

1. Push this repo to GitHub (or GitLab/Bitbucket).
2. In [Vercel](https://vercel.com), **New Project** → import the repo.
3. Vercel auto-detects Next.js — no build config changes needed.
4. Add environment variables (Project Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (mark as **sensitive**)
5. Deploy. Every push to `main` redeploys automatically.

## What's built (Phase 1)

- Chart of accounts (seeded, editable)
- Double-entry journal engine (every invoice/expense posts a balanced entry)
- Invoicing with automatic CGST/SGST vs IGST split based on place of supply
- Invoice PDF/print view
- Expense tracking with GST and TDS section auto-calculation
- Partner capital & current accounts
- Section 40(b) remuneration calculator with distribution among partners
- GSTR-1 computation (B2B, B2C summary, HSN summary) — JSON export
- GSTR-3B computation (output tax vs ITC, net payable) — JSON export
- Profit & Loss and Balance Sheet reports
- Compliance calendar (auto-generated GST/TDS due dates)

## Deliberately not built yet (see PRD Phase 2+)

- Multi-tenant SaaS billing/subscription (schema supports it; UI doesn't exist)
- Direct GSTN API filing (JSON export only — file manually on the GST portal)
- E-invoice / e-way bill generation
- TDS return (24Q/26Q) FVU file generation
- Bank statement import & reconciliation
- CA Partner multi-client portal

## Project structure

```
app/
  (app)/              All authenticated pages (dashboard, invoices, expenses, ...)
  auth/login/         Login page
lib/
  accounting/         Journal engine, reports, remuneration calculator, money utils
  gst/                GST calculation, GSTR-1/3B computation, state codes
  supabase/           Browser/server/middleware Supabase clients + types
  tenant.ts           Resolves the logged-in user's tenant
components/
  ui/                 Button, Input, Card, Badge — design system primitives
  layout/             Sidebar, Topbar
  invoices/ expenses/ partners/ gst/ accounts/ settings/ compliance/
    Feature-specific dialogs and forms
supabase/migrations/  SQL schema, RLS policies, seed data
```

## A note on correctness

The GST and Section 40(b) calculations in `lib/gst/` and
`lib/accounting/remuneration.ts` follow the CGST Act and Income Tax Act rules
as understood at time of writing, but this is not a substitute for review by
your CA before filing. Cross-check the first few months' computed returns
against a manual calculation before relying on them fully.
