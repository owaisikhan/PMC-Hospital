-- PMC (Paeds Medical Complex) — core schema
-- Money rules live in Postgres, not in the UI: constraints here hold even if a
-- request bypasses the app entirely.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type user_role       as enum ('admin', 'staff');
create type gender          as enum ('male', 'female', 'other');
create type admission_status as enum ('admitted', 'discharged', 'referred', 'expired', 'lama');
create type ledger_direction as enum ('in', 'out');
create type income_category  as enum ('admission', 'pharmacy', 'lab', 'other');
create type expense_category as enum ('rent', 'salaries', 'electricity', 'pharmacy_purchase', 'lab_payout', 'other');
create type payment_method   as enum ('cash', 'bank', 'card', 'other');
create type lab_order_status as enum ('ordered', 'sample_sent', 'resulted', 'cancelled');

-- ---------------------------------------------------------------------------
-- People and access
-- ---------------------------------------------------------------------------
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        user_role not null default 'staff',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);
comment on table profiles is 'One row per login. Role drives every access rule in 0002_rls.sql.';

create table patients (
  id             uuid primary key default gen_random_uuid(),
  mrn            text not null unique,
  full_name      text not null,
  father_name    text,
  date_of_birth  date not null,
  gender         gender not null,
  guardian_phone text,
  address        text,
  notes          text,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  constraint patients_dob_not_future check (date_of_birth <= current_date)
);
comment on column patients.date_of_birth is 'Paediatric ages are derived from this, never stored — age in days matters for neonates.';

create index patients_name_idx on patients using gin (to_tsvector('simple', full_name));
create index patients_mrn_idx  on patients (mrn);

create table staff (
  id             uuid primary key default gen_random_uuid(),
  full_name      text not null,
  designation    text not null,
  monthly_salary numeric(12,2) not null check (monthly_salary >= 0),
  phone          text,
  joined_on      date not null default current_date,
  left_on        date,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  constraint staff_left_after_joined check (left_on is null or left_on >= joined_on)
);
comment on table staff is 'Employment record. Separate from profiles: not every employee gets a login.';

-- ---------------------------------------------------------------------------
-- Wards and charge rates
-- ---------------------------------------------------------------------------
create table wards (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  code       text not null unique,
  total_beds integer not null default 0 check (total_beds >= 0),
  sort_order integer not null default 0,
  is_active  boolean not null default true
);

create table charge_rates (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  amount      numeric(12,2) not null check (amount >= 0),
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  updated_at  timestamptz not null default now()
);
comment on table charge_rates is
  'Per-day rates, editable by admin. Amounts are copied onto admission_services at
   admission time so changing a rate never rewrites an existing patient bill.';

-- ---------------------------------------------------------------------------
-- Admissions
-- ---------------------------------------------------------------------------
create table admissions (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references patients(id),
  ward_id       uuid not null references wards(id),
  admitted_on   date not null default current_date,
  discharged_on date,
  status        admission_status not null default 'admitted',
  diagnosis     text,
  notes         text,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now(),
  constraint admissions_discharge_after_admit
    check (discharged_on is null or discharged_on >= admitted_on),
  constraint admissions_status_matches_discharge
    check ((status = 'admitted') = (discharged_on is null))
);

create index admissions_patient_idx on admissions (patient_id);
create index admissions_open_idx    on admissions (ward_id) where discharged_on is null;

-- The stacking model: one row per care level per date range.
-- NICU 1st-5th + ventilator 2nd-3rd = two rows, billed 5 days + 2 days.
create table admission_services (
  id             uuid primary key default gen_random_uuid(),
  admission_id   uuid not null references admissions(id) on delete cascade,
  charge_rate_id uuid not null references charge_rates(id),
  rate_amount    numeric(12,2) not null check (rate_amount >= 0),
  from_date      date not null,
  to_date        date,
  created_by     uuid not null references profiles(id),
  created_at     timestamptz not null default now(),
  constraint admission_services_range check (to_date is null or to_date >= from_date)
);
comment on column admission_services.rate_amount is
  'Snapshot of charge_rates.amount at the time of admission. A later rate change
   must never silently alter an old bill.';

create index admission_services_admission_idx on admission_services (admission_id);

-- Billable days are derived, never typed in. Inclusive of both end dates, so a
-- same-day admission and discharge still bills one day.
create view admission_charge_lines as
  select
    s.id             as service_id,
    s.admission_id,
    r.code           as charge_code,
    r.name           as charge_name,
    s.rate_amount,
    s.from_date,
    coalesce(s.to_date, a.discharged_on, current_date) as effective_to,
    (coalesce(s.to_date, a.discharged_on, current_date) - s.from_date + 1) as days,
    s.rate_amount * (coalesce(s.to_date, a.discharged_on, current_date) - s.from_date + 1) as line_total
  from admission_services s
  join admissions a   on a.id = s.admission_id
  join charge_rates r on r.id = s.charge_rate_id;

create view admission_totals as
  select admission_id, sum(line_total) as total_charges
  from admission_charge_lines
  group by admission_id;
