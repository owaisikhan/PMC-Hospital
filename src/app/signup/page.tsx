import { Suspense } from "react"
import { HeartPulse } from "lucide-react"

import { SignupForm } from "@/components/auth/signup-form"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Create account" }

/**
 * Whether anyone has signed up yet decides the copy: the first account becomes
 * the administrator, everyone after it waits for approval. Asked via an RPC
 * rather than a count, because RLS hides the profiles table from anon and a
 * count would always come back 0.
 */
async function isFirstAccount(): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  const supabase = await createClient()
  const { data, error } = await supabase.rpc("setup_completed")
  // On error assume setup is done: wrongly offering an admin account to a
  // stranger is far worse than wrongly telling the real first user to wait.
  if (error) return false
  return data === false
}

export default async function SignupPage() {
  const first = await isFirstAccount()

  return (
    <main className="flex min-h-dvh items-center justify-center bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-6" />
          </span>
          <h1 className="text-lg font-semibold tracking-tight">PMC</h1>
          <p className="text-sm text-muted-foreground">
            {first
              ? "Create the administrator account"
              : "Create a staff account"}
          </p>
        </div>

        <Suspense
          fallback={<div className="h-96 rounded-xl border border-border bg-card" />}
        >
          <SignupForm isFirstAccount={first} />
        </Suspense>
      </div>
    </main>
  )
}
