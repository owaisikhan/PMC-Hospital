"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, UserPlus } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { registerPatient, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"

export function RegisterPatientDialog({
  triggerLabel = "Register patient",
}: {
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    registerPatient,
    null
  )
  const { formRef, captureValues } = useFormValues(result)

  // Close only once the database has confirmed. A refusal keeps the dialog
  // open, because that message is the whole interaction.
  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <UserPlus className="size-4.5" aria-hidden />
        {triggerLabel}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Register a patient"
        description="The medical record number is created automatically."
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <Field label="Patient's name" htmlFor="full_name" required>
            <input id="full_name" name="full_name" required autoComplete="off" className={controlClass} />
          </Field>

          <Field label="Father's name" htmlFor="father_name">
            <input id="father_name" name="father_name" autoComplete="off" className={controlClass} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Date of birth"
              htmlFor="date_of_birth"
              required
              hint="Age is worked out from this."
            >
              <input
                id="date_of_birth"
                name="date_of_birth"
                type="date"
                required
                max={todayISO()}
                className={controlClass}
              />
            </Field>

            <Field label="Gender" htmlFor="gender" required>
              <select id="gender" name="gender" required defaultValue="" className={controlClass}>
                <option value="" disabled>
                  Choose…
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>

          <Field label="Guardian's phone" htmlFor="guardian_phone">
            <input
              id="guardian_phone"
              name="guardian_phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className={controlClass}
            />
          </Field>

          <Field label="Address" htmlFor="address">
            <input id="address" name="address" autoComplete="off" className={controlClass} />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-11 rounded-lg border border-border px-4 text-base font-medium transition-colors hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Saving…" : "Register patient"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
