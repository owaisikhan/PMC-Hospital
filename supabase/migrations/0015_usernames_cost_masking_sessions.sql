-- Username logins for staff, cost/margin masking for staff, and a way for an
-- admin to see who is actually signed in right now.

-- ---------------------------------------------------------------------------
-- Staff sign in with a username, never an email. There is no second identity
-- system for this: a staff username is stored as an ordinary auth.users email
-- under a fixed internal domain (never shown, never mailable), so the rest of
-- Supabase Auth — sessions, RLS, password reset via admin.updateUserById —
-- keeps working unchanged. profiles.username is a readable mirror of that
-- email's local part, kept in sync by handle_new_user below, so the UI never
-- has to parse an email to show someone their own username.
-- ---------------------------------------------------------------------------
alter table profiles add column username text unique;
comment on column profiles.username is
  'Mirrors the local part of a staff.pmc.local email. Null for a real-email (admin) login.';

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_profiles integer;
  assigned_role     user_role;
  assigned_active   boolean;
  derived_username  text;
begin
  select count(*) into existing_profiles from public.profiles;

  if existing_profiles = 0 then
    assigned_role   := 'admin';
    assigned_active := true;
  else
    assigned_role   := 'staff';
    assigned_active := false;
  end if;

  derived_username := case
    when new.email like '%@staff.pmc.local' then split_part(new.email, '@', 1)
    else null
  end;

  insert into public.profiles (id, full_name, role, is_active, username)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    assigned_role,
    assigned_active,
    derived_username
  );

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff can see a medicine is in stock and a test can be ordered; they should
-- not see what either actually costs PMC, only what the patient is charged.
-- Postgres RLS is row-level, not column-level, and every login connects as
-- the same "authenticated" database role, so a plain GRANT/REVOKE on the
-- column cannot tell an admin's request from a staff member's. A view that
-- nulls the sensitive column for anyone who is not an admin is the standard
-- way around that. security_invoker keeps the underlying table's own RLS in
-- force — this adds a mask on top, not a replacement for it.
-- ---------------------------------------------------------------------------
create view pharmacy_batches_view
with (security_invoker = true)
as
select
  id, item_id, batch_no, expiry_date, qty_received, qty_remaining,
  case when is_admin() then cost_price else null end as cost_price,
  sale_price, received_on, created_by, created_at
from pharmacy_batches;

create view lab_tests_view
with (security_invoker = true)
as
select
  id, name, external_lab, charge_price,
  case when is_admin() then cost_price else null end as cost_price,
  is_active
from lab_tests;

create view lab_orders_view
with (security_invoker = true)
as
select
  id, patient_id, admission_id, test_id, ordered_on, status,
  charge_amount,
  case when is_admin() then cost_amount else null end as cost_amount,
  external_lab, result_note, created_by, created_at
from lab_orders;

create view pharmacy_sale_items_view
with (security_invoker = true)
as
select
  id, sale_id, batch_id, qty, unit_price,
  case when is_admin() then unit_cost else null end as unit_cost,
  line_total
from pharmacy_sale_items;

grant select on pharmacy_batches_view, lab_tests_view, lab_orders_view, pharmacy_sale_items_view
  to authenticated;

-- admission_balances() already runs security definer as of 0010_billing.sql —
-- checked against the live function definition before assuming otherwise, so
-- nothing to change here: a staff member taking a payment already sees the
-- correct balance afterwards.

-- ---------------------------------------------------------------------------
-- Every currently-signed-in device, for the admin's Permissions tab. auth.
-- sessions is not reachable from PostgREST at all, so this is the only way to
-- surface it; is_admin() guards it the same way list_logins() is guarded.
-- device/browser is parsed from user_agent on the client, not here — SQL is
-- the wrong tool for that, and the raw string is kept too so the parsing can
-- be improved later without a migration.
-- ---------------------------------------------------------------------------
create or replace function list_sessions()
returns table (
  user_id      uuid,
  full_name    text,
  role         user_role,
  session_id   uuid,
  user_agent   text,
  ip           text,
  created_at   timestamptz,
  refreshed_at timestamp,
  not_after    timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.role, s.id, s.user_agent, host(s.ip),
         s.created_at, s.refreshed_at, s.not_after
  from auth.sessions s
  join profiles p on p.id = s.user_id
  where is_admin()
    and (s.not_after is null or s.not_after > now())
  order by coalesce(s.refreshed_at, s.created_at) desc;
$$;

revoke execute on function list_sessions() from public;
grant execute on function list_sessions() to authenticated;
