import { NextResponse, type NextRequest } from "next/server"

import { createClient } from "@/lib/supabase/server"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export async function GET(request: NextRequest) {
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  return NextResponse.redirect(new URL("/login", request.url))
}

export const POST = GET
