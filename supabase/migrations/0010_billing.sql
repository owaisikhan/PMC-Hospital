-- Billing: payments, concessions, and who may see what.
--
-- Two problems this solves.
--
-- 1. admission_balances ran with invoker rights, so staff - the people actually
--    taking cash at the desk - saw every family as having paid nothing, because
--    RLS hides ledger_entries from them. Receptionists cannot collect a balance
--    they are not allowed to see. The function becomes security definer and
--    returns only per-admission aggregates: staff learn what one child owes and
--    still cannot read the ledger, expenses, salaries or any revenue total.
--
-- 2. There was no way to reduce a bill. A family that genuinely cannot pay the
--    full amount would otherwise sit in "outstanding" for ever, and the only
--    way to clear it would be to record cash that never arrived - overstating
--    income. A concession is recorded explicitly instead, so the write-off is
--    visible, attributable, and never counted as revenue.

create table admission_discounts (
  id           uuid primary key default gen_random_uuid(),
  admission_id uuid not null references admissions(id) on delete cascade,
  amount       numeric(12,2) not null check (amount > 0),
  reason       text not null,
  created_by   uuid not null references profiles(id),
  created_at   timestamptz not null default now()
);

comment on table admission_discounts is
  'Concessions written off a bill. Never touches the ledger: money not received
   is not income. Rows rather than a column, so several concessions can be given
   and each keeps its own reason and author.';

create index admission_discounts_admission_idx on admission_discounts (admission_id);

alter table admission_discounts enable row level security;

create policy "admin reads discounts" on admission_discounts
  for select using (is_admin());
create policy "admin writes discounts" on admission_discounts
  for insert with check (is_admin() and created_by = auth.uid());

create trigger audit_admission_discounts
  after insert or update or delete on admission_discounts
  for each row execute function write_audit_log();

drop function if exists outstanding_total();
drop function if exists admission_balances();

create function admission_balances()
returns table (
  admission_id    uuid,
  patient_id      uuid,
  total_charges   numeric,
  total_discount  numeric,
  total_paid      numeric,
  balance         numeric,
  is_discharged   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.patient_id,
    coalesce(t.total_charges, 0),
    coalesce(d.discount, 0),
    coalesce(p.paid, 0),
    coalesce(t.total_charges, 0) - coalesce(d.discount, 0) - coalesce(p.paid, 0),
    a.discharged_on is not null
  from admissions a
  left join admission_totals t on t.admission_id = a.id
  left join (
    select admission_id, sum(amount) as discount
    from admission_discounts group by admission_id
  ) d on d.admission_id = a.id
  left join (
    -- A reversal is an opposite-direction row pointing at the original, so a
    -- cancelled payment must not still count as paid.
    select le.admission_id, sum(le.amount) as paid
    from ledger_entries le
    where le.direction = 'in'
      and le.admission_id is not null
      and not exists (select 1 from ledger_entries r where r.reverses_id = le.id)
    group by le.admission_id
  ) p on p.admission_id = a.id
  where is_active_user();
$$;

-- Payments for one stay, so the desk can show a family what they have already
-- paid without opening the ledger. Scoped to a single admission, so it cannot
-- be used to walk the whole ledger.
create or replace function admission_payments(p_admission_id uuid)
returns table (
  id          uuid,
  amount      numeric,
  method      text,
  occurred_on date,
  description text,
  is_reversed boolean,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select le.id, le.amount, le.method::text, le.occurred_on, le.description,
         exists (select 1 from ledger_entries r where r.reverses_id = le.id),
         le.created_at
  from ledger_entries le
  where le.admission_id = p_admission_id
    and le.direction = 'in'
    and le.reverses_id is null
    and is_active_user()
  order by le.occurred_on desc, le.created_at desc;
$$;

-- Total owed across every stay. admission_balances is definer now, so this must
-- check the role itself or it would hand staff a hospital-wide figure.
create function outstanding_total()
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select case
    when is_admin() then (select coalesce(sum(balance), 0) from admission_balances() where balance > 0)
    else null
  end;
$$;

-- SECURITY: Supabase ships ALTER DEFAULT PRIVILEGES granting EXECUTE on every
-- new public function directly to anon and authenticated. That is a grant to
-- the role, not to PUBLIC, so "revoke ... from public" does not remove it - and
-- did not, for the functions added in 0008 and 0009. Until this migration,
-- admission_balances and admission_payments were SECURITY DEFINER with no role
-- check and reachable by anon, so anyone holding the publishable key (which
-- ships in the browser and is public by design) could read every patient's
-- charges, balance and payment history without signing in.
--
-- Revoke from anon explicitly, and note the is_active_user() guards written
-- into the function bodies above, so a future default-privilege grant cannot
-- silently reopen this.
revoke execute on function admission_balances()        from public, anon;
revoke execute on function admission_payments(uuid)    from public, anon;
revoke execute on function outstanding_total()         from public, anon;
revoke execute on function next_mrn()                  from public, anon;
revoke execute on function money_summary(date, date)   from public, anon;
grant execute on function admission_balances()         to authenticated;
grant execute on function admission_payments(uuid)     to authenticated;
grant execute on function outstanding_total()          to authenticated;
grant execute on function next_mrn()                   to authenticated;
grant execute on function money_summary(date, date)    to authenticated;

-- next_mrn checks the caller too, so it cannot be used to burn record numbers.
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
  if not is_active_user() then
    raise exception 'Not permitted.';
  end if;

  insert into mrn_counters (year, last_value)
  values (yr, 1)
  on conflict (year) do update set last_value = mrn_counters.last_value + 1
  returning last_value into nxt;

  return 'PMC-' || yr::text || '-' || lpad(nxt::text, 5, '0');
end;
$$;

revoke execute on function next_mrn() from public, anon;
grant execute on function next_mrn() to authenticated;

-- pmc_today also had a mutable search_path.
create or replace function pmc_today()
returns date
language sql
stable
set search_path = public
as $$ select (now() at time zone 'Asia/Karachi')::date $$;

revoke execute on function pmc_today() from public, anon;
grant execute on function pmc_today() to authenticated;

-- Trigger functions need no EXECUTE grant: Postgres checks it when a trigger is
-- created, not when it fires. No reason for them to sit on the REST surface.
revoke execute on function check_patient_dob()        from public, anon, authenticated;
revoke execute on function validate_ledger_reversal() from public, anon, authenticated;
