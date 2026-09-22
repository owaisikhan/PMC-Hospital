"use client"

import { useActionState, useRef, useState } from "react"
import { Loader2, Upload } from "lucide-react"

import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { changePassword, updateOwnName, uploadLogo, type ActionResult } from "@/lib/actions"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"

const sectionClass = "flex flex-col gap-4 rounded-xl surface p-5"

export function NameForm({ fullName }: { fullName: string }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    updateOwnName,
    null
  )
  useToastOnResult(result)

  return (
    <form action={action} className={sectionClass}>
      <h2 className="text-base font-semibold">Name</h2>
      <Field label="Full name" htmlFor="full_name" required>
        <input
          id="full_name"
          name="full_name"
          required
          autoComplete="name"
          defaultValue={fullName}
          className={controlClass}
        />
      </Field>
      <FormMessage result={result} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
        {pending ? "Saving…" : "Save name"}
      </button>
    </form>
  )
}

export function EmailDisplay({ email }: { email: string }) {
  return (
    <div className={sectionClass}>
      <h2 className="text-base font-semibold">Email</h2>
      <Field
        label="Email"
        htmlFor="email"
        hint="This is your login and cannot be changed here. Ask an administrator to add a new login with a different email if it needs to change."
      >
        <input
          id="email"
          value={email}
          disabled
          className={`${controlClass} bg-muted text-muted-foreground`}
        />
      </Field>
    </div>
  )
}

export function PasswordForm() {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    changePassword,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={captureValues}
      className={sectionClass}
    >
      <div>
        <h2 className="text-base font-semibold">Change password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          You stay signed in here; every other device you are signed in on is signed out.
        </p>
      </div>
      <Field label="Current password" htmlFor="old_password" required>
        <input
          id="old_password"
          name="old_password"
          type="password"
          required
          autoComplete="current-password"
          className={controlClass}
        />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="New password" htmlFor="new_password" required hint="At least 8 characters.">
          <input
            id="new_password"
            name="new_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={controlClass}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password" required>
          <input
            id="confirm_password"
            name="confirm_password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={controlClass}
          />
        </Field>
      </div>
      <FormMessage result={result} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
        {pending ? "Updating…" : "Update password"}
      </button>
    </form>
  )
}

/** Admin only — changes what every login sees in the sidebar. */
export function LogoForm({ currentUrl }: { currentUrl: string | null }) {
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    uploadLogo,
    null
  )
  useToastOnResult(result)
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState(result)

  // The file input clears on a successful submit (the form resets), so the
  // local preview needs clearing with it or it would keep showing a picked
  // file that is no longer selected. Derived during render rather than in an
  // effect, so the preview never paints once more before correcting itself.
  if (result !== lastResult) {
    setLastResult(result)
    if (result?.ok) setPreview(null)
  }

  return (
    <form action={action} className={sectionClass}>
      <h2 className="text-base font-semibold">Clinic logo</h2>
      <p className="text-sm text-muted-foreground">
        Shown in the sidebar for every login. PNG or JPEG, under 2 MB.
      </p>

      <div className="flex flex-wrap items-center gap-4">
        <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-muted">
          {preview || currentUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- a small, admin-uploaded logo; not worth the image optimizer.
            <img
              src={preview ?? currentUrl ?? undefined}
              alt="Clinic logo"
              className="size-full object-contain"
            />
          ) : (
            <span className="text-xs text-muted-foreground">None</span>
          )}
        </span>

        <div className="flex flex-col gap-2">
          <input
            ref={fileRef}
            id="logo"
            name="logo"
            type="file"
            accept="image/png,image/jpeg"
            required
            onChange={(event) => {
              const file = event.target.files?.[0]
              setPreview(file ? URL.createObjectURL(file) : null)
            }}
            className="text-sm text-muted-foreground file:mr-3 file:h-9 file:rounded-lg file:border file:border-border file:bg-background file:px-3 file:text-sm file:font-medium file:text-foreground hover:file:bg-muted"
          />
        </div>
      </div>

      <FormMessage result={result} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? (
          <Loader2 className="size-4.5 animate-spin" aria-hidden />
        ) : (
          <Upload className="size-4.5" aria-hidden />
        )}
        {pending ? "Uploading…" : "Upload logo"}
      </button>
    </form>
  )
}
