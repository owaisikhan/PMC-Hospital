/**
 * No imports, safe for the client bundle: the login form needs
 * staffEmailFor to turn what someone typed into the address Supabase Auth
 * actually signs in with, and it must never pull in the service-role admin
 * client (src/lib/supabase/admin.ts) just to get there.
 */

/**
 * The fixed, unmailable domain a staff username is stored under in
 * auth.users. Never shown to anyone; the login form appends it for a value
 * that is not itself an email, and the database mirrors it back out as
 * profiles.username.
 */
export const STAFF_LOGIN_DOMAIN = "staff.pmc.local"

export function staffEmailFor(username: string): string {
  return `${username.trim().toLowerCase()}@${STAFF_LOGIN_DOMAIN}`
}

/** A staff username: letters, numbers, dots, dashes and underscores, 3-32 characters. */
export const USERNAME_PATTERN = /^[a-z0-9._-]{3,32}$/i
