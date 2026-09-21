"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { createLogin, type ActionResult } from "@/lib/actions"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

type LoginType = "staff" | "admin"

export function CreateLoginButton() {
  const [open, setOpen] = useState(false)
  const [loginType, setLoginType] = useState<LoginType>("staff")
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    createLogin,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => {
        setOpen(false)
        setLoginType("staff")
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <UserPlus className="size-4.5" aria-hidden />
        Add login
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a login"
        description="Active immediately — there is no approval step and nothing is emailed. Tell them the password yourself."
      >
        <form
          ref={formRef}
          action={action}
          onSubmit={captureValues}
          className="flex flex-col gap-4"
        >
          <Field label="Type" htmlFor="login_type_staff" required>
            <div className="flex gap-2">
              <label
                className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium transition-colors ${
                  loginType === "staff"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  id="login_type_staff"
                  type="radio"
                  name="login_type"
                  value="staff"
                  checked={loginType === "staff"}
                  onChange={() => setLoginType("staff")}
                  className="sr-only"
                />
                Staff
              </label>
              <label
                className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border text-base font-medium transition-colors ${
                  loginType === "admin"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-input text-muted-foreground hover:bg-muted"
                }`}
              >
                <input
                  type="radio"
                  name="login_type"
                  value="admin"
                  checked={loginType === "admin"}
                  onChange={() => setLoginType("admin")}
                  className="sr-only"
                />
                Administrator
              </label>
            </div>
          </Field>

          <Field label="Name" htmlFor="full_name" required>
            <input
              id="full_name"
              name="full_name"
              required
              autoComplete="off"
              className={controlClass}
            />
          </Field>

          {loginType === "staff" ? (
            <Field
              label="Username"
              htmlFor="identifier"
              required
              hint="Letters, numbers, dots, dashes and underscores — no spaces, no @. This is what they type to sign in, not an email."
            >
              <input
                id="identifier"
                name="identifier"
                required
                autoComplete="off"
                placeholder="rubina.akhtar"
                pattern="[a-zA-Z0-9._-]{3,32}"
                className={controlClass}
              />
            </Field>
          ) : (
            <Field label="Email" htmlFor="identifier" required>
              <input
                id="identifier"
                name="identifier"
                type="email"
                required
                autoComplete="off"
                className={controlClass}
              />
            </Field>
          )}

          <Field label="Password" htmlFor="password" required hint="At least 8 characters. Give this to them yourself.">
            <input
              id="password"
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              className={controlClass}
            />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Creating…" : "Create login"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
