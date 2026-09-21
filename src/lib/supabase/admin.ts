import { createClient as createSupabaseClient } from "@supabase/supabase-js"

/**
 * Service-role client, for the one thing a signed-in session can never do:
 * create another login or reset someone else's password without them present
 * to click a confirmation link. Every caller of this module has already been
 * checked as admin by the action that imports it — this file trusts that and
 * enforces nothing of its own, so it must never be imported anywhere the
 * browser can reach.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceKey) {
    throw new Error(
      "Logins cannot be created or reset yet — SUPABASE_SERVICE_ROLE_KEY is not set. " +
        "Add it in .env.local (and in the Vercel project's environment variables) from " +
        "the Supabase dashboard: Project Settings → API Keys → service_role secret."
    )
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
