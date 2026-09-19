# PMC — Paeds Medical Complex

Hospital management and ledger for PMC, a paediatric hospital: 24×7 paediatric
emergency, NICU, PICU, measles ward, general ward, pharmacy, and laboratory
(currently sent to external labs).

The whole site sits behind login. There are no public pages.

## Stack

- **Next.js 16** (App Router, React 19, TypeScript strict)
- **Supabase** — Postgres, Auth, and row level security
- **Tailwind CSS v4** with oklch design tokens, **shadcn/ui**, **Lucide**

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in the Supabase URL and anon key
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run check` | lint + typecheck + build |

## Roles

| Role | Can do | Cannot |
| --- | --- | --- |
| **admin** | Everything — money, reports, rates, staff, user accounts | — |
| **staff** | Register patients, admit and discharge, pharmacy sales, lab orders, record income | Read the ledger, expenses, salaries or reports |

**The first account to sign up becomes the active administrator.** Every signup
after that is created as **inactive staff** and must be activated by an admin
before it can reach anything. Visit `/signup` on a fresh install to create the
administrator.

Access is enforced by Postgres row level security, not by the UI. Hiding a
sidebar link is a tidiness measure; the database refuses the read regardless.

## How the money works

Every rupee in or out is one row in **`ledger_entries`**, the single source of
truth for cash. Income comes from admissions, pharmacy, lab and other; expenses
from rent, salaries, electricity, pharmacy stock purchases, external lab payouts
and other.

The table is **append-only** — `update` and `delete` are revoked from every
client role. A mistake is corrected by inserting a *reversal* row, which the
database checks must match the original's amount and run in the opposite
direction. Nothing in the money history can be silently rewritten, and
`audit_log` records who did what and when.

### Admission billing

Charges are **per day and stack**. An admission holds one row per care level per
date range in `admission_services`:

```
NICU        1–5 Sep   5 days × ₨5,000  = ₨25,000
Ventilator  2–3 Sep   2 days × ₨16,000 = ₨32,000
                                  total  ₨57,000
```

Totals are derived by the `admission_charge_lines` and `admission_totals` views,
never typed in, so correcting a date corrects the bill. Each service row stores
a **snapshot of the rate** at admission time — editing a rate in Settings changes
future admissions only and never rewrites a bill already raised.

## Database

Migrations live in `supabase/migrations/` and are applied in order:

| File | Contents |
| --- | --- |
| `0001_core_schema.sql` | Profiles, patients, staff, wards, charge rates, admissions |
| `0002_pharmacy_lab_money.sql` | Pharmacy batches and sales, lab orders, ledger, audit log |
| `0003_row_level_security.sql` | RLS policies, append-only ledger, new-user trigger |
| `0004_seed_reference_data.sql` | PMC's wards, charge rates and settings |
| `0005_security_hardening.sql` | Linter fixes: view security_invoker, search_path, function grants |
| `0006_first_user_becomes_admin.sql` | Bootstrap: first signup becomes an active admin |
| `0007_setup_completed_check.sql` | `setup_completed()` so the signup page can tell first-run from later |

## Structure

```
src/
  app/
    (app)/            # Signed-in shell: sidebar + topbar + module routes
    login/            # Sign in
    auth/signout/     # Sign out route handler
  components/
    layout/           # Sidebar, topbar, page header, module placeholder
    ui/               # shadcn primitives
  lib/
    supabase/         # Browser/server clients, session and role helpers
    navigation.ts     # Sidebar model, with per-role visibility
    dates.ts          # Clock access, kept out of render bodies
    format.ts         # PKR money and paediatric age formatting
  proxy.ts            # Auth gate (Next 16 renamed Middleware to Proxy)
```

## Status

**Phase 0 complete** — database, roles, signup, login and app shell are in place
and the whole site is gated. Module screens are being built one at a time; routes not yet
built render a short list of what is coming.

Patients is the single place for clinical work: register a child, admit them,
and see who is in the hospital via the Admitted / All filter. Each child has a
detail page holding their record and every stay with its itemised bill. There
is no separate Wards section - filtering a list beats splitting it across
routes, which would make someone decide where a child lives before they can
look for them.

Build order: billing → expenses and salaries → pharmacy → laboratory.
