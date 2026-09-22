-- Settings > Permissions lists every signed-in device per login, with roughly
-- where it is, when it was last active, and a way for an admin to sign one out.

-- ---------------------------------------------------------------------------
-- Where and when a session was last seen. auth.sessions records the IP a
-- session signed in from and refreshed_at, which only moves once an hour when
-- the token refreshes - too coarse for "active 5 seconds ago", and with no
-- place name at all. The proxy fills this in from Vercel's geo headers as
-- people use the app (throttled, see proxy.ts).
--
-- Keyed on the session and cascading from it, so signing a device out -
-- however that happens - takes its row with it.
-- ---------------------------------------------------------------------------
create table session_locations (
  session_id   uuid primary key references auth.sessions(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  city         text,
  region       text,
  country      text,
  ip           text,
  last_seen_at timestamptz not null default now()
);

-- No policies: nothing reads or writes this table directly. The functions
-- below are the only way in, and each checks who is asking.
alter table session_locations enable row level security;

-- ---------------------------------------------------------------------------
-- Record the caller's own session. The session id comes from the caller's
-- own JWT, never from a parameter, so a login can only ever describe the
-- device it is actually on - it cannot write a location onto someone else's
-- session, or onto a session id it guessed.
-- ---------------------------------------------------------------------------
create or replace function record_session_activity(
  p_city text, p_region text, p_country text, p_ip text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sid uuid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
begin
  if sid is null or auth.uid() is null then
    return;
  end if;
  if not exists (select 1 from auth.sessions where id = sid and user_id = auth.uid()) then
    return;
  end if;

  insert into session_locations as sl (session_id, user_id, city, region, country, ip, last_seen_at)
  values (
    sid, auth.uid(),
    nullif(left(p_city, 80), ''), nullif(left(p_region, 16), ''),
    nullif(left(p_country, 2), ''), nullif(left(p_ip, 64), ''),
    now()
  )
  on conflict (session_id) do update set
    -- A request without geo headers (local dev) refreshes last_seen_at but
    -- does not wipe a location already known.
    city         = coalesce(excluded.city, sl.city),
    region       = coalesce(excluded.region, sl.region),
    country      = coalesce(excluded.country, sl.country),
    ip           = coalesce(excluded.ip, sl.ip),
    last_seen_at = now();
end;
$$;

revoke execute on function record_session_activity(text, text, text, text) from public;
grant execute on function record_session_activity(text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- The admin's view of every live session, now with location and real last
-- activity. Return type changes, so it has to be dropped and recreated.
-- ---------------------------------------------------------------------------
drop function list_sessions();

create function list_sessions()
returns table (
  user_id      uuid,
  full_name    text,
  role         user_role,
  session_id   uuid,
  user_agent   text,
  ip           text,
  created_at   timestamptz,
  refreshed_at timestamp,
  not_after    timestamptz,
  city         text,
  country      text,
  seen_ip      text,
  last_seen_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select p.id, p.full_name, p.role, s.id, s.user_agent, host(s.ip),
         s.created_at, s.refreshed_at, s.not_after,
         l.city, l.country, l.ip, l.last_seen_at
  from auth.sessions s
  join profiles p on p.id = s.user_id
  left join session_locations l on l.session_id = s.id
  where is_admin()
    and (s.not_after is null or s.not_after > now())
  order by coalesce(l.last_seen_at, s.refreshed_at, s.created_at) desc;
$$;

revoke execute on function list_sessions() from public;
grant execute on function list_sessions() to authenticated;

-- ---------------------------------------------------------------------------
-- Signing devices out. Deleting the auth.sessions row cascades to its refresh
-- tokens, and Supabase rejects an access token whose session no longer
-- exists, so the device is bounced to the login page on its very next
-- request (the proxy validates the session on every one) rather than
-- lingering until its token would have expired.
-- ---------------------------------------------------------------------------
create or replace function revoke_session(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if not is_admin() then
    raise exception 'Only an administrator can sign a device out.' using errcode = '42501';
  end if;
  delete from auth.sessions where id = p_session_id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Every device a login is signed in on: after an admin resets that login's
-- password, and when a login is deactivated.
create or replace function revoke_user_sessions(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  if not is_admin() then
    raise exception 'Only an administrator can sign a login out.' using errcode = '42501';
  end if;
  delete from auth.sessions where user_id = p_user_id;
  get diagnostics removed = row_count;
  return removed;
end;
$$;

revoke execute on function revoke_session(uuid) from public;
revoke execute on function revoke_user_sessions(uuid) from public;
grant execute on function revoke_session(uuid) to authenticated;
grant execute on function revoke_user_sessions(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- "from public" is not enough on Supabase. Its default privileges grant
-- EXECUTE on every new public function to anon by name, which a revoke from
-- PUBLIC leaves standing - checked, and anon could call all four of the
-- above. Each already refuses a signed-out caller from the inside (is_admin()
-- or auth.uid() is null), so nothing leaked, but 0005's rule is that anon
-- does not get to run these at all. list_logins (0014/0016) had the same
-- gap and is closed here too.
-- ---------------------------------------------------------------------------
revoke execute on function record_session_activity(text, text, text, text) from anon;
revoke execute on function list_sessions()                                 from anon;
revoke execute on function list_logins()                                   from anon;
revoke execute on function revoke_session(uuid)                            from anon;
revoke execute on function revoke_user_sessions(uuid)                      from anon;
