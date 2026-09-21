"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { resetLoginPassword, setLogin, type ActionResult } from "@/lib/actions"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"
const smallButton =
  "flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"

/**
 * Every action on this tab is the same shape underneath - set a login's role
 * and active flag - so one confirm dialog covers approving, promoting,
 * demoting, deactivating and reactivating. Only the copy on the button and
 * the dialog changes.
 */
function LoginActionButton({
  userId,
  role,
  isActive,
  buttonLabel,
  buttonClass,
  title,
  description,
  confirmLabel,
}: {
  userId: string
  role: "admin" | "staff"
  isActive: boolean
  buttonLabel: string
  buttonClass: string
  title: string
  description: string
  confirmLabel: string
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    setLogin,
    null
  )
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={buttonClass}>
        {buttonLabel}
      </button>

      <Dialog open={open} onClose={() => setOpen(false)} title={title} description={description}>
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="user_id" value={userId} />
          <input type="hidden" name="role" value={role} />
          <input type="hidden" name="is_active" value={String(isActive)} />

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Working…" : confirmLabel}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function PromoteButton({ userId, name }: { userId: string; name: string }) {
  return (
    <LoginActionButton
      userId={userId}
      role="admin"
      isActive={true}
      buttonLabel="Make admin"
      buttonClass={smallButton}
      title={`Make ${name} an administrator`}
      description="They gain full access — money, staff, settings and every other login. Only give this to someone who should have it."
      confirmLabel="Make admin"
    />
  )
}

export function DemoteButton({ userId, name }: { userId: string; name: string }) {
  return (
    <LoginActionButton
      userId={userId}
      role="staff"
      isActive={true}
      buttonLabel="Make staff"
      buttonClass={smallButton}
      title={`Make ${name} a staff account`}
      description="They keep patient, lab and pharmacy access, and lose money, staff and settings access."
      confirmLabel="Make staff"
    />
  )
}

export function DeactivateButton({
  userId,
  name,
  role,
}: {
  userId: string
  name: string
  role: "admin" | "staff"
}) {
  return (
    <LoginActionButton
      userId={userId}
      role={role}
      isActive={false}
      buttonLabel="Deactivate"
      buttonClass={smallButton}
      title={`Deactivate ${name}`}
      description="They can no longer sign in. Their record and everything they entered stays exactly as it is, and this can be undone at any time."
      confirmLabel="Deactivate"
    />
  )
}

export function ReactivateButton({
  userId,
  name,
  role,
}: {
  userId: string
  name: string
  role: "admin" | "staff"
}) {
  return (
    <LoginActionButton
      userId={userId}
      role={role}
      isActive={true}
      buttonLabel="Reactivate"
      buttonClass={smallButton}
      title={`Reactivate ${name}`}
      description="They can sign in again immediately."
      confirmLabel="Reactivate"
    />
  )
}

/**
 * There is no "forgot password" flow: a staff login has no real email to
 * send a reset link to. This is how a password changes when someone
 * forgets it, or when the admin wants to hand out a fresh one.
 */
export function ResetPasswordButton({ userId, name }: { userId: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    resetLoginPassword,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={smallButton}>
        Reset password
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Reset ${name}'s password`}
        description="Takes effect immediately. Tell them the new password yourself — nothing is emailed."
      >
        <form
          ref={formRef}
          action={action}
          onSubmit={captureValues}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="user_id" value={userId} />

          <Field label="New password" htmlFor="reset_password" required hint="At least 8 characters.">
            <input
              id="reset_password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
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
              {pending ? "Resetting…" : "Reset password"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
