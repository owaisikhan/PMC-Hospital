-- Salaries paid in instalments.
--
-- UNIQUE (staff_id, for_month) assumed a salary is paid once, in full. It is
-- not: a hospital pays Rs 4,000 against a Rs 400,000 salary and settles the
-- rest later. The constraint made that a dead end - the row existed, so the
-- Pay button hid itself, and the database would have refused a second payment
-- anyway. There was no way to finish paying someone.
--
-- Many payments per person per month now, summed. The same shape the billing
-- page already uses for a family paying a bill in parts.

alter table public.salary_payments
  drop constraint if exists salary_payments_staff_id_for_month_key;

-- The constraint was also the lookup index for "what has this person been paid
-- this month", so it is replaced rather than simply dropped.
create index if not exists salary_payments_staff_month_idx
  on public.salary_payments (staff_id, for_month);

-- Same function, without the one-payment-per-month guard. Both inserts still
-- happen in one transaction, and it stays SECURITY INVOKER so row level
-- security keeps this to admins.
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

revoke execute on function
  public.pay_salary(uuid, date, numeric, date, payment_method, text)
  from public, anon;
grant execute on function
  public.pay_salary(uuid, date, numeric, date, payment_method, text)
  to authenticated;
