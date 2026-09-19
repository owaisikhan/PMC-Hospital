-- PMC — row level security
--
-- Two roles. Staff run the clinic day to day; admin sees the money.
-- Enforced here rather than in React, so the rules survive anyone poking at the
-- API directly with a browser console open.

create or replace function current_role_is(target user_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = target and is_active
  );
$$;

create or replace function is_admin() returns boolean
language sql stable
as $$ select current_role_is('admin'); $$;

create or replace function is_active_user() returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from profiles where id = auth.uid() and is_active); $$;

alter table profiles            enable row level security;
alter table patients            enable row level security;
alter table staff               enable row level security;
alter table wards               enable row level security;
alter table charge_rates        enable row level security;
alter table admissions          enable row level security;
alter table admission_services  enable row level security;
alter table pharmacy_items      enable row level security;
alter table pharmacy_batches    enable row level security;
alter table pharmacy_sales      enable row level security;
alter table pharmacy_sale_items enable row level security;
alter table lab_tests           enable row level security;
alter table lab_orders          enable row level security;
alter table ledger_entries      enable row level security;
alter table salary_payments     enable row level security;
alter table settings            enable row level security;
alter table audit_log           enable row level security;

-- --- profiles --------------------------------------------------------------
create policy "read own profile" on profiles
  for select using (id = auth.uid() or is_admin());
create policy "admin manages profiles" on profiles
  for all using (is_admin()) with check (is_admin());

-- --- clinical: both roles read and write ------------------------------------
create policy "staff read patients" on patients
  for select using (is_active_user());
create policy "staff add patients" on patients
  for insert with check (is_active_user() and created_by = auth.uid());
create policy "staff edit patients" on patients
  for update using (is_active_user()) with check (is_active_user());
create policy "admin deletes patients" on patients
  for delete using (is_admin());

create policy "staff read admissions" on admissions
  for select using (is_active_user());
create policy "staff add admissions" on admissions
  for insert with check (is_active_user() and created_by = auth.uid());
create policy "staff edit admissions" on admissions
  for update using (is_active_user()) with check (is_active_user());

create policy "staff read admission services" on admission_services
  for select using (is_active_user());
create policy "staff add admission services" on admission_services
  for insert with check (is_active_user() and created_by = auth.uid());
create policy "staff edit admission services" on admission_services
  for update using (is_active_user()) with check (is_active_user());

-- --- reference data: everyone reads, admin writes ---------------------------
create policy "read wards" on wards for select using (is_active_user());
create policy "admin writes wards" on wards for all using (is_admin()) with check (is_admin());

create policy "read charge rates" on charge_rates for select using (is_active_user());
create policy "admin writes charge rates" on charge_rates
  for all using (is_admin()) with check (is_admin());

create policy "read lab tests" on lab_tests for select using (is_active_user());
create policy "admin writes lab tests" on lab_tests
  for all using (is_admin()) with check (is_admin());

create policy "read pharmacy items" on pharmacy_items for select using (is_active_user());
create policy "admin writes pharmacy items" on pharmacy_items
  for all using (is_admin()) with check (is_admin());

create policy "read settings" on settings for select using (is_active_user());
create policy "admin writes settings" on settings for all using (is_admin()) with check (is_admin());

-- --- pharmacy ---------------------------------------------------------------
-- Staff sell stock, but cost prices sit on the batch, so batches stay admin-only
-- for writes while remaining readable (staff need expiry and quantity).
create policy "read batches" on pharmacy_batches for select using (is_active_user());
create policy "admin writes batches" on pharmacy_batches
  for all using (is_admin()) with check (is_admin());

create policy "staff read sales" on pharmacy_sales for select using (is_active_user());
create policy "staff add sales" on pharmacy_sales
  for insert with check (is_active_user() and created_by = auth.uid());

create policy "staff read sale items" on pharmacy_sale_items for select using (is_active_user());
create policy "staff add sale items" on pharmacy_sale_items
  for insert with check (is_active_user());

-- --- laboratory -------------------------------------------------------------
create policy "staff read lab orders" on lab_orders for select using (is_active_user());
create policy "staff add lab orders" on lab_orders
  for insert with check (is_active_user() and created_by = auth.uid());
create policy "staff edit lab orders" on lab_orders
  for update using (is_active_user()) with check (is_active_user());

-- --- money: admin only ------------------------------------------------------
-- Staff record payments as they take them, but cannot read the ledger back.
-- That means no totals, no P&L, no expenses, no salaries.
create policy "admin reads ledger" on ledger_entries
  for select using (is_admin());
create policy "record income" on ledger_entries
  for insert with check (
    is_active_user()
    and created_by = auth.uid()
    and (is_admin() or direction = 'in')
  );

create policy "admin reads salaries" on salary_payments for select using (is_admin());
create policy "admin writes salaries" on salary_payments
  for all using (is_admin()) with check (is_admin());

create policy "admin reads staff" on staff for select using (is_admin());
create policy "admin writes staff" on staff for all using (is_admin()) with check (is_admin());

create policy "admin reads audit log" on audit_log for select using (is_admin());

-- --- append-only ledger -----------------------------------------------------
-- No policy grants update or delete on ledger_entries, and revoking at the table
-- level closes it off even to a future policy added by mistake. Corrections go
-- in as reversal rows.
revoke update, delete on ledger_entries from authenticated, anon;
revoke update, delete on audit_log      from authenticated, anon;
revoke insert on audit_log              from authenticated, anon;

-- New signups land as inactive staff until an admin approves and activates them.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'staff',
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
