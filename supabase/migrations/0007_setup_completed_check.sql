-- The signup page must know whether any account exists yet, to decide between
-- "create the administrator" and "create a staff account". It cannot learn this
-- by counting profiles: RLS gives anon no read on that table, so the count comes
-- back 0 whether or not accounts exist — which would offer administrator to
-- every visitor forever.
--
-- This returns exactly one bit, never a row, and no identifying detail.

create or replace function setup_completed()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles);
$$;

revoke execute on function setup_completed() from public;
grant execute on function setup_completed() to anon, authenticated;

comment on function setup_completed() is
  'True once at least one account exists. Deliberately readable by anon so the
   signup page can tell the first administrator apart from later staff signups.';
