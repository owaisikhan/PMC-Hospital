import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

/**
 * POST only, deliberately.
 *
 * This was a GET route reached from a <Link>, which Next.js prefetches — so
 * merely rendering the topbar could sign the user out mid-session. A POST is
 * never prefetched, and signing out is a state change, so GET was wrong anyway.
 */
export async function POST(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  return NextResponse.redirect(new URL("/login", request.url), {
    // 303 makes the browser follow with GET after the POST.
    status: 303,
  })
}
