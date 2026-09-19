-- Fixes raised by the Supabase security linter after 0001-0004.

-- 1. Views default to SECURITY DEFINER, which would run them with the creator's
--    rights and bypass RLS. Make them respect the caller instead.
alter view admission_charge_lines set (security_invoker = on);
alter view admission_totals       set (security_invoker = on);

-- 2. Pin search_path on the two functions missing it, so a caller cannot shadow
--    a table name and change what the function resolves to.
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public
as $$ select current_role_is('admin'); $$;

create or replace function validate_ledger_reversal()
returns trigger language plpgsql set search_path = public
as $$
declare
  original ledger_entries;
begin
  if new.reverses_id is null then
    return new;
  end if;

  select * into original from ledger_entries where id = new.reverses_id;

  if original.reverses_id is not null then
    raise exception 'Cannot reverse a reversal';
  end if;

  if new.amount <> original.amount then
    raise exception 'A reversal must match the original amount (% vs %)', new.amount, original.amount;
  end if;

  if new.direction = original.direction then
    raise exception 'A reversal must run opposite to the original entry';
  end if;

  return new;
end;
$$;

-- 3. Every function is granted EXECUTE to PUBLIC on creation, and that implicit
--    grant sits underneath anon/authenticated — revoking from the roles alone
--    leaves the REST endpoints reachable. Revoke from PUBLIC, then grant back
--    only what the RLS policies genuinely need.
revoke execute on function write_audit_log()          from public;
revoke execute on function deduct_pharmacy_stock()    from public;
revoke execute on function handle_new_user()          from public;
revoke execute on function current_role_is(user_role) from public;
revoke execute on function is_active_user()           from public;
revoke execute on function is_admin()                 from public;
revoke execute on function validate_ledger_reversal() from public;

-- The RLS policies call these three as the querying user, so signed-in users
-- must keep EXECUTE. They only ever report on the caller's own role.
grant execute on function current_role_is(user_role) to authenticated;
grant execute on function is_active_user()           to authenticated;
grant execute on function is_admin()                 to authenticated;

-- The trigger functions need no grant: Postgres checks EXECUTE when a trigger
-- is created, not when it fires.
