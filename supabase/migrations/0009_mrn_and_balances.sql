-- Medical record numbers: PMC-2026-00001, restarting each calendar year.
-- Generated in the database so two people registering at once cannot collide;
-- the unique index on patients.mrn is the final backstop.

create table if not exists mrn_counters (
  year       integer primary key,
  last_value integer not null default 0
);

alter table mrn_counters enable row level security;
-- No policy: reached only through the security-definer function below.

create or replace function next_mrn()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  yr  integer := extract(year from pmc_today())::integer;
  nxt integer;
begin
  insert into mrn_counters (year, last_value)
  values (yr, 1)
  on conflict (year) do update set last_value = mrn_counters.last_value + 1
  returning last_value into nxt;

  return 'PMC-' || yr::text || '-' || lpad(nxt::text, 5, '0');
end;
$$;

revoke execute on function next_mrn() from public;
grant execute on function next_mrn() to authenticated;

alter table patients alter column mrn set default next_mrn();

-- What a stay has been charged, what has been paid against it, and the gap.
--
-- A reversal is stored as an opposite-direction row pointing at the original,
-- so filtering on direction = 'in' alone would never see it and a cancelled
-- payment would still count as paid, leaving a family looking paid up when they
-- are not. Any income row that something reverses is excluded instead.
create or replace function admission_balances()
returns table (
  admission_id   uuid,
  patient_id     uuid,
  total_charges  numeric,
  total_paid     numeric,
  balance        numeric,
  is_discharged  boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    a.id,
    a.patient_id,
    coalesce(t.total_charges, 0),
    coalesce(p.paid, 0),
    coalesce(t.total_charges, 0) - coalesce(p.paid, 0),
    a.discharged_on is not null
  from admissions a
  left join admission_totals t on t.admission_id = a.id
  left join (
    select le.admission_id, sum(le.amount) as paid
    from ledger_entries le
    where le.direction = 'in'
      and le.admission_id is not null
      and not exists (select 1 from ledger_entries r where r.reverses_id = le.id)
    group by le.admission_id
  ) p on p.admission_id = a.id;
$$;

revoke execute on function admission_balances() from public;
grant execute on function admission_balances() to authenticated;

create or replace function outstanding_total()
returns numeric
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(sum(balance), 0) from admission_balances() where balance > 0;
$$;

revoke execute on function outstanding_total() from public;
grant execute on function outstanding_total() to authenticated;
