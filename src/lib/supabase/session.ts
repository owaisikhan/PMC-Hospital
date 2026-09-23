import { cache } from "react"
import { redirect } from "next/navigation"

import type { UserRole } from "@/lib/roles"
import { createClient } from "./server"
import { isSupabaseConfigured } from "./env"

export type { UserRole }

export interface SessionProfile {
  id: string
  fullName: string
  role: UserRole
  isActive: boolean
  email: string
}

/**
 * Signed-in profile, or null. Does not redirect.
 *
 * Wrapped in React's cache() so the layout (for the header) and the page
 * (for its role check) share one lookup per request instead of each doing
 * their own.
 *
 * The identity comes from getClaims(), which checks the access token's
 * signature locally against the project's public signing keys (kept in
 * memory between requests) - no trip to the auth server. That is safe here
 * because the proxy has already asked the auth server about this very token
 * on this very request (getUser there), and turned the request away if it
 * was signed out or revoked. Asking a second and third time only added a
 * round trip each (~150 ms when the server and database sat on different
 * continents).
 */
export const getSessionProfile = cache(async (): Promise<SessionProfile | null> => {
  if (!isSupabaseConfigured) return null

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()
  const claims = data?.claims
  if (!claims?.sub) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", claims.sub)
    .single()

  if (!profile) return null

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active,
    email: typeof claims.email === "string" ? claims.email : "",
  }
})

/** Signed-in profile, or redirect to login. Use at the top of protected pages. */
export async function requireProfile(): Promise<SessionProfile> {
  const profile = await getSessionProfile()
  if (!profile) redirect("/login")
  if (!profile.isActive) redirect("/pending-approval")
  return profile
}

/** Admin-only pages call this; staff are bounced to the dashboard. */
export async function requireAdmin(): Promise<SessionProfile> {
  const profile = await requireProfile()
  if (profile.role !== "admin") redirect("/")
  return profile
}
