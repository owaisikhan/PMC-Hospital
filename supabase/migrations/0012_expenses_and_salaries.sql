-- Expenses page: correct the money summary, and make paying a salary atomic.

-- ---------------------------------------------------------------------------
-- 1. money_summary counted reversals as real money.
--
-- Reversing a patient payment writes an opposite-direction row, and that row
-- carries expense_cat = 'other' because the ledger requires a category that
-- matches the direction. The summary grouped every row blindly, so a reversed
-- Rs 1,801 payment showed up as Rs 1,801 of "other" expense AND left the
-- original Rs 1,801 counted as income. Net profit came out right, which is why
-- this went unnoticed, but both category totals were overstated - and the
-- Expenses page shows those categories directly, so the owner would go looking
-- for an expense that never happened.
--
-- A reversal and the entry it reverses cancel each other, so neither belongs in
-- the totals.
-- ---------------------------------------------------------------------------
create or replace function public.money_summary(from_date date, to_date date)
returns table(direction text, category text, total numeric)
language sql
stable
set search_path to 'public'
as $$
  with live as (
    select le.*
    from ledger_entries le
    where le.reverses_id is null
      and not exists (
        select 1 from ledger_entries r where r.reverses_id = le.id
      )
  )
  select 'in'::text, income_cat::text, sum(amount)
  from live
  where direction = 'in' and occurred_on between from_date and to_date
  group by income_cat
  union all
  select 'out'::text, expense_cat::text, sum(amount)
  from live
  where direction = 'out' and occurred_on between from_date and to_date
  group by expense_cat;
$$;

-- ---------------------------------------------------------------------------
-- 2. Paying a salary writes two rows: the ledger entry and the salary record
-- that links to it. Done from the application those are two round trips, and
-- if the second fails - most likely on the unique (staff_id, for_month)
-- constraint, i.e. the month was already paid - the first has already
-- committed. The ledger is append-only, so that orphan expense could never be
-- deleted, only reversed. A function body is one transaction, so both rows
-- land or neither does.
--
-- SECURITY INVOKER on purpose: row level security already limits salaries and
-- outbound ledger rows to admins, so this needs no elevated rights. The
-- is_admin() check below is only there to fail with a sentence a person can
-- read rather than a policy violation.
-- ---------------------------------------------------------------------------
create or replace function public.pay_salary(
  p_staff_id uuid,
  p_for_month date,
  p_amount numeric,
  p_paid_on date,
  p_method payment_method,
  p_description text
)
returns uuid
language plpgsql
security invoker
set search_path to 'public'
as $$
declare
  v_ledger_id uuid;
  v_name text;
  v_month date := date_trunc('month', p_for_month)::date;
begin
  if not is_admin() then
    raise exception 'Only an administrator can pay salaries';
  end if;

  select full_name into v_name from staff where id = p_staff_id;
  if v_name is null then
    raise exception 'That staff member could not be found';
  end if;

  if exists (
    select 1 from salary_payments
    where staff_id = p_staff_id and for_month = v_month
  ) then
    -- Caught by name in the application and turned into plain words.
    raise exception 'SALARY_ALREADY_PAID';
  end if;

  insert into ledger_entries (
    direction, expense_cat, amount, occurred_on, method, description,
    staff_id, created_by
  )
  values (
    'out', 'salaries', p_amount, p_paid_on, coalesce(p_method, 'cash'),
    coalesce(nullif(btrim(p_description), ''), 'Salary - ' || v_name),
    p_staff_id, auth.uid()
  )
  returning id into v_ledger_id;

  insert into salary_payments (
    staff_id, for_month, amount, paid_on, ledger_id, created_by
  )
  values (p_staff_id, v_month, p_amount, p_paid_on, v_ledger_id, auth.uid());

  return v_ledger_id;
end;
$$;

-- Supabase grants EXECUTE to anon and authenticated by default, so anon is
-- revoked explicitly rather than relying on `revoke ... from public`.
revoke execute on function
  public.pay_salary(uuid, date, numeric, date, payment_method, text)
  from public, anon;
grant execute on function
  public.pay_salary(uuid, date, numeric, date, payment_method, text)
  to authenticated;
