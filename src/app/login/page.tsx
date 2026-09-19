import { Suspense } from "react"
import { HeartPulse } from "lucide-react"

import { LoginForm } from "@/components/auth/login-form"
import { isSupabaseConfigured } from "@/lib/supabase/env"

export const metadata = { title: "Sign in" }

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-6" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight">PMC</h1>
          <p className="text-sm text-muted-foreground">Paeds Medical Complex</p>
        </div>

        {isSupabaseConfigured ? (
          // useSearchParams reads the ?next= redirect, so the form renders on the
          // client and the page shell prerenders around it.
          <Suspense fallback={<div className="h-72 rounded-xl border border-border bg-card" />}>
            <LoginForm />
          </Suspense>
        ) : (
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
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
