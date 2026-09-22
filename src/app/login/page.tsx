import { Suspense } from "react"
import { HeartPulse } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  // Nobody is signed in here, so this reads the one settings key a signed-out
  // visitor is allowed (migration 0018's "read branding" policy). Reaching for
  // it costs this page its prerender, which for a login screen is a fair
  // trade for showing the hospital's own logo rather than a stock glyph.
  let logoUrl: string | null = null
  if (isSupabaseConfigured) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle()
    logoUrl = (data?.value as { logo_url?: string } | null)?.logo_url ?? null
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-primary text-primary-foreground">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- a small, admin-uploaded logo; not worth the image optimizer.
              <img src={logoUrl} alt="" className="size-full object-contain" />
            ) : (
              <HeartPulse className="size-6" />
            )}
          </span>
          <h1 className="text-lg font-semibold tracking-tight">PMC</h1>
          <p className="text-sm text-muted-foreground">Paeds Medical Complex</p>
        </div>

        {isSupabaseConfigured ? (
          // useSearchParams reads the ?next= redirect, so the form renders on the
          // client and the page shell prerenders around it.
          <Suspense fallback={<div className="h-72 rounded-xl surface" />}>
            <LoginForm />
          </Suspense>
        ) : (
          <div className="rounded-xl surface p-5 text-sm">
            <p className="font-medium">Not configured yet</p>
            <p className="mt-1.5 text-muted-foreground">
              Copy <code className="font-mono text-xs">.env.example</code> to{" "}
              <code className="font-mono text-xs">.env.local</code> and fill in the
              Supabase URL and anon key.
            </p>
          </div>
        )}
      </div>
    </main>
  )
}
