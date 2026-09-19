-- Bootstrap: the very first account to sign up becomes an active admin.
-- Without this there is no way into a fresh install, because every route is
-- gated and only an admin can activate anyone. Every later signup lands as an
-- inactive staff member awaiting approval, exactly as before.
--
-- The count runs inside the trigger, which holds a row lock on the auth.users
-- insert, so two simultaneous first signups cannot both be promoted.

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
begin
  select count(*) into existing_profiles from public.profiles;

  if existing_profiles = 0 then
    assigned_role   := 'admin';
    assigned_active := true;
  else
    assigned_role   := 'staff';
    assigned_active := false;
  end if;

  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    assigned_role,
    assigned_active
  );

  return new;
end;
$$;

revoke execute on function handle_new_user() from public;
