-- PMC operates in Pakistan; the database runs in UTC. Between 19:00 and 24:00
-- UTC it is already the next day in Karachi, so current_date would file a 1am
-- admission or a midnight payment under the previous day, and would reject a
-- newborn whose date of birth is "today" in Karachi as being in the future.
-- For a 24x7 emergency hospital that is a real five-hour window every night.
--
-- One function owns the business day, and everything else uses it.

create or replace function pmc_today()
returns date
language sql
stable
as $$ select (now() at time zone 'Asia/Karachi')::date $$;

comment on function pmc_today() is
  'Today in PMC business time (Asia/Karachi). Never use current_date directly:
   the server is UTC and would roll the date over five hours early.';

grant execute on function pmc_today() to authenticated;

alter table admissions       alter column admitted_on  set default pmc_today();
alter table pharmacy_batches alter column received_on  set default pmc_today();
alter table pharmacy_sales   alter column sold_on      set default pmc_today();
alter table lab_orders       alter column ordered_on   set default pmc_today();
alter table ledger_entries   alter column occurred_on  set default pmc_today();
alter table salary_payments  alter column paid_on      set default pmc_today();
alter table staff            alter column joined_on    set default pmc_today();

-- A check constraint cannot call a stable function, so the "not in the future"
-- rule becomes a trigger.
alter table patients drop constraint if exists patients_dob_not_future;

create or replace function check_patient_dob()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.date_of_birth > pmc_today() then
    raise exception 'Date of birth cannot be in the future. Today is %.', pmc_today();
  end if;
  return new;
end;
$$;

revoke execute on function check_patient_dob() from public;

create trigger patients_check_dob
  before insert or update of date_of_birth on patients
  for each row execute function check_patient_dob();

-- The open-ended admission views used current_date for a stay still running;
-- rebuild them on the business day instead.
drop view if exists admission_totals;
drop view if exists admission_charge_lines;

create view admission_charge_lines with (security_invoker = on) as
  select
    s.id             as service_id,
    s.admission_id,
    r.code           as charge_code,
    r.name           as charge_name,
    s.rate_amount,
    s.from_date,
    coalesce(s.to_date, a.discharged_on, pmc_today()) as effective_to,
    (coalesce(s.to_date, a.discharged_on, pmc_today()) - s.from_date + 1) as days,
    s.rate_amount * (coalesce(s.to_date, a.discharged_on, pmc_today()) - s.from_date + 1) as line_total
  from admission_services s
  join admissions a   on a.id = s.admission_id
  join charge_rates r on r.id = s.charge_rate_id;

create view admission_totals with (security_invoker = on) as
  select admission_id, sum(line_total) as total_charges
  from admission_charge_lines
  group by admission_id;

-- One place computes the dashboard's money, so no two screens can disagree.
-- security invoker, so row level security still applies: staff calling this get
-- nothing back, exactly as they get nothing from ledger_entries.
create or replace function money_summary(from_date date, to_date date)
returns table (direction text, category text, total numeric)
language sql
stable
security invoker
set search_path = public
as $$
  select 'in'::text, income_cat::text, sum(amount)
  from ledger_entries
  where direction = 'in' and occurred_on between from_date and to_date
  group by income_cat
  union all
  select 'out'::text, expense_cat::text, sum(amount)
  from ledger_entries
  where direction = 'out' and occurred_on between from_date and to_date
  group by expense_cat;
$$;

comment on function money_summary(date, date) is
  'Income and expense totals by category for a date range, inclusive. Invoker
   rights, so RLS decides who sees anything.';

revoke execute on function money_summary(date, date) from public;
grant execute on function money_summary(date, date) to authenticated;
