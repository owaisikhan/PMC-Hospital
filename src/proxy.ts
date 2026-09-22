import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import { sessionIdFromAccessToken } from "@/lib/supabase/session-id"

// Next.js 16 renamed Middleware to Proxy. This runs before every page render
// and does two jobs: refresh the Supabase session cookie, and keep the whole
// site behind login.
// No /signup: every login is created by an administrator, never self-served.
const PUBLIC_PATHS = ["/login", "/pending-approval", "/auth"]

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Without credentials there is no session to check; let pages render their
  // own setup notice rather than redirect-looping.
  if (!url || !anonKey) return NextResponse.next()

  let response = NextResponse.next({ request })

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value)
        }
        response = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options)
        }
      },
    },
  })

  // getUser() revalidates against Supabase — do not swap it for getSession(),
  // which trusts a cookie the browser could have tampered with.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  )

  if (!user && !isPublic) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = "/login"
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user && pathname === "/login") {
    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = "/"
    homeUrl.search = ""
    return NextResponse.redirect(homeUrl)
  }

  if (user && !isPublic) {
    const seen = await recordActivity(supabase, request)
    // Set on the final response object: setAll above may have swapped it for
    // a fresh one while refreshing the session.
    if (seen) response.cookies.set(SEEN_COOKIE, seen, SEEN_COOKIE_OPTIONS)
  }

  return response
}

/**
 * Settings > Permissions shows each signed-in device with roughly where it is
 * and when it was last active. Vercel geolocates every request for free and
 * passes the result as headers, so the place comes from there - no IP is sent
 * to a third-party lookup. Local dev has no such headers; activity is still
 * recorded, the place just stays empty.
 *
 * Throttled by a cookie so the database is written at most once every few
 * minutes per device, not on every click - sooner only if the device's place
 * changes or it is a different session (a fresh sign-in on the same browser).
 */
const SEEN_COOKIE = "pmc-seen"
const SEEN_EVERY_MS = 5 * 60 * 1000
const SEEN_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 60 * 60 * 24,
}

async function recordActivity(
  supabase: ReturnType<typeof createServerClient>,
  request: NextRequest
): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const sessionId = sessionIdFromAccessToken(session?.access_token)
  if (!sessionId) return null

  const country = request.headers.get("x-vercel-ip-country") ?? ""
  const region = request.headers.get("x-vercel-ip-country-region") ?? ""
  let city = ""
  try {
    // Vercel URL-encodes it: "Nowshera", but "S%C3%A3o%20Paulo".
    city = decodeURIComponent(request.headers.get("x-vercel-ip-city") ?? "")
  } catch {}
  // Only an address Vercel vouches for. Locally x-forwarded-for is just ::1.
  const ip = country
    ? (request.headers.get("x-real-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "")
    : ""

  const place = `${city}|${country}`
  let last: string[] = []
  try {
    last = decodeURIComponent(request.cookies.get(SEEN_COOKIE)?.value ?? "").split("~")
  } catch {}
  const [lastSession, lastPlace, lastAt] = last
  if (
    lastSession === sessionId &&
    lastPlace === place &&
    Date.now() - Number(lastAt) < SEEN_EVERY_MS
  ) {
    return null
  }

  const { error } = await supabase.rpc("record_session_activity", {
    p_city: city,
    p_region: region,
    p_country: country,
    p_ip: ip,
  })
  // Not worth failing a page load over; try again on the next request.
  if (error) return null

  return encodeURIComponent(`${sessionId}~${place}~${Date.now()}`)
}

export const config = {
  // Skip static assets and image optimisation; everything else is gated.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
