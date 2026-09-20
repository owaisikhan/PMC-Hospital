"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2 } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { FormMessage } from "@/components/ui/form-message"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { setLogin, type ActionResult } from "@/lib/actions"

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

export function ApproveLoginButton({ userId, name }: { userId: string; name: string }) {
  return (
    <LoginActionButton
      userId={userId}
      role="staff"
      isActive={true}
      buttonLabel="Approve"
      buttonClass={primaryButton.replace("h-11 px-4", "h-9 px-3 text-sm")}
      title={`Approve ${name}`}
      description="They sign in as staff from then on. You can make them an administrator afterwards if needed."
      confirmLabel="Approve"
    />
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
