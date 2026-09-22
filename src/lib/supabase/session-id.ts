/**
 * The session_id claim from a Supabase access token - which device this is.
 *
 * Decoded, not verified: every caller has already had the token checked by
 * Supabase (getUser in the proxy, requireProfile on a page), and the id is
 * only used to label or throttle, never to grant anything. The database
 * functions that act on a session read it from the verified JWT themselves.
 */
export function sessionIdFromAccessToken(token: string | null | undefined): string | null {
  const payload = token?.split(".")[1]
  if (!payload) return null
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")))
    return typeof claims.session_id === "string" ? claims.session_id : null
  } catch {
    return null
  }
}
