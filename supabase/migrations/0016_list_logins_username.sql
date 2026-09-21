-- list_logins() needs to hand back username now that one exists (0015), so
-- the Permissions tab can show it instead of a synthetic email nobody types.
drop function list_logins();

create function list_logins()
returns table (
  id         uuid,
  full_name  text,
  username   text,
  role       user_role,
  is_active  boolean,
  email      text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.username, p.role, p.is_active, u.email, p.created_at
  from profiles p
  join auth.users u on u.id = p.id
  where is_admin()
  order by p.is_active desc, p.role desc, p.full_name;
$$;

revoke execute on function list_logins() from public;
grant execute on function list_logins() to authenticated;
