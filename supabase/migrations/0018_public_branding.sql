-- The login page shows the hospital's own logo, and nobody is signed in when
-- it renders. "read settings" is gated on is_active_user(), so the branding
-- row - the one holding the uploaded logo's URL - was unreadable there and
-- the page fell back to the generic heart glyph no matter what the admin
-- uploaded.

-- ---------------------------------------------------------------------------
-- A second, narrower read policy rather than loosening "read settings":
-- policies are permissive, so these OR together - an active login still reads
-- every key, and a signed-out visitor reads this one row and nothing else.
-- The rest stay private: hospital_name, currency and lab_mode say more about
-- how the place runs than a stranger at the login screen needs to know.
--
-- The logo itself was already public - it lives in the public "branding"
-- storage bucket and is served straight from a CDN URL - so this exposes the
-- address of a file anyone could already fetch, not the file.
--
-- The two existing policies are pinned to authenticated at the same time, and
-- that half is what actually makes this work. A permissive policy set is
-- evaluated in full, so an anonymous select still ran "read settings" ->
-- is_active_user() and "admin writes settings" -> is_admin(). 0005 revoked
-- EXECUTE on both from PUBLIC and granted it back to authenticated only, on
-- purpose, so anon did not merely get false back - the whole query died with
-- "permission denied for function is_active_user" before this new policy was
-- ever consulted. Naming the role keeps those two out of an anonymous
-- query's path entirely, which is cheaper than widening the grant and leaves
-- 0005's hardening exactly as it was.
-- ---------------------------------------------------------------------------
alter policy "read settings"         on settings to authenticated;
alter policy "admin writes settings" on settings to authenticated;

create policy "read branding" on settings
  for select to anon, authenticated using (key = 'branding');
