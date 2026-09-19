/**
 * Supabase connection details.
 *
 * Kept in one place and read lazily so the app still builds before the project
 * is provisioned — `isSupabaseConfigured` lets pages show a setup notice
 * instead of crashing at import time.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export function requireSupabaseEnv() {
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local (see .env.example)."
    )
  }
  return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY }
}
