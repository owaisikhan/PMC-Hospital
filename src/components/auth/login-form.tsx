"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { staffEmailFor } from "@/lib/auth"
import { describeAuthError } from "@/lib/auth-errors"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const supabase = createClient()
      // An administrator signs in with their email; a staff login has no
      // real email at all, only a username - anything without an "@" is
      // assumed to be one and turned into the synthetic address it is
      // actually stored under.
      const email = identifier.includes("@") ? identifier : staffEmailFor(identifier)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Supabase returns the same message for a wrong password and an unknown
        // address, which is what we want: it does not reveal who has an account.
        setError(describeAuthError(signInError.message))
        return
      }

      router.replace(searchParams.get("next") || "/")
      router.refresh()
    } catch {
      setError(describeAuthError("network"))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-6 shadow-xs"
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="identifier" className="text-sm font-medium">
          Email or username
        </label>
        <Input
          id="identifier"
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
          autoComplete="username"
          required
          className="h-9"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium">
          Password
        </label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
          className="h-9"
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" disabled={isSubmitting} className="w-full">
        {isSubmitting ? <Loader2 className="animate-spin" /> : null}
        {isSubmitting ? "Signing in…" : "Sign in"}
      </Button>

      {/* No self-signup: every login, admin or staff, is created by an
          administrator from Settings. */}
    </form>
  )
}
