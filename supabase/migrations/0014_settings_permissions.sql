-- Settings page: personal info (name, password, clinic logo) and permissions
-- (the login list — approve, promote/demote, deactivate).

-- ---------------------------------------------------------------------------
-- A member changes their own display name, nothing else. A direct UPDATE
-- policy on profiles would need column-level RLS to stop the same request
-- also touching role or is_active; a function that only ever writes
-- full_name closes that off entirely, the same reasoning as pay_salary being
-- an RPC rather than two client-side inserts.
-- ---------------------------------------------------------------------------
create or replace function update_own_full_name(p_full_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Enter your name.';
  end if;

  update profiles set full_name = trim(p_full_name) where id = auth.uid();
end;
$$;

revoke execute on function update_own_full_name(text) from public;
grant execute on function update_own_full_name(text) to authenticated;

-- ---------------------------------------------------------------------------
-- The Permissions tab needs each login's email, which lives in auth.users —
-- unreachable from PostgREST with the anon/authenticated key. This exposes
-- just the columns that page needs, and only to an admin; anyone else gets an
-- empty result rather than an error, matching how is_admin() is used
-- elsewhere as a boolean guard rather than a raised exception.
-- ---------------------------------------------------------------------------
create or replace function list_logins()
returns table (
  id         uuid,
  full_name  text,
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
  select p.id, p.full_name, p.role, p.is_active, u.email, p.created_at
  from profiles p
  join auth.users u on u.id = p.id
  where is_admin()
  order by p.is_active desc, p.role desc, p.full_name;
$$;

revoke execute on function list_logins() from public;
grant execute on function list_logins() to authenticated;

-- ---------------------------------------------------------------------------
-- Every route is gated by requireProfile/requireAdmin, so losing the last
-- active admin locks everyone out of the app with no way back in short of
-- editing the database directly. Blocked at the row level, not just in the
-- UI, so it holds regardless of what wrote the update.
-- ---------------------------------------------------------------------------
create or replace function prevent_last_admin_removal()
returns trigger
language plpgsql
as $$
begin
  if old.role = 'admin' and old.is_active
     and (new.role <> 'admin' or new.is_active = false) then
    if not exists (
      select 1 from profiles
      where role = 'admin' and is_active and id <> old.id
    ) then
      raise exception 'LAST_ADMIN: at least one active administrator must remain';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_last_admin
  before update on profiles
  for each row execute function prevent_last_admin_removal();

-- ---------------------------------------------------------------------------
-- Clinic logo. One object, overwritten in place (upsert), so the sidebar
-- always reads the same public URL rather than accumulating unused files.
-- Public bucket: the sidebar renders it as a plain <img src>, and a clinic
-- logo carries no confidentiality — the alternative is a signed URL refreshed
-- on every page load for no benefit.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do nothing;

create policy "public reads branding" on storage.objects
  for select using (bucket_id = 'branding');

create policy "admin writes branding" on storage.objects
  for insert with check (bucket_id = 'branding' and public.is_admin());

create policy "admin updates branding" on storage.objects
  for update using (bucket_id = 'branding' and public.is_admin())
  with check (bucket_id = 'branding' and public.is_admin());

create policy "admin deletes branding" on storage.objects
  for delete using (bucket_id = 'branding' and public.is_admin());
