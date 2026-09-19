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

/** Signed-in profile, or null. Does not redirect. */
export async function getSessionProfile(): Promise<SessionProfile | null> {
  if (!isSupabaseConfigured) return null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .single()

  if (!profile) return null

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active,
    email: user.email ?? "",
  }
}

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
