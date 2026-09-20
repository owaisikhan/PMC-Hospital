"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Plus, Undo2 } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { recordExpense, reverseExpense, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"
import { formatPKR } from "@/lib/format"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

function useClosingAction(
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>,
  onDone: () => void
) {
  const [result, dispatch, pending] = useActionState<ActionResult | null, FormData>(
    action,
    null
  )
  useToastOnResult(result)
  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(onDone, 1600)
      return () => clearTimeout(timer)
    }
  }, [result, onDone])
  return [result, dispatch, pending] as const
}

export function RecordExpenseButton() {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useClosingAction(recordExpense, () => setOpen(false))
  const { formRef, captureValues } = useFormValues(result)

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Plus className="size-4.5" aria-hidden />
        Record expense
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Record an expense"
        description="Money already paid out. Corrections are made by reversing, never by editing."
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <Field
            label="What was it for"
            htmlFor="expense_cat"
            required
            hint="Salaries are paid on the Salaries tab, so each one is tied to a person and a month. Stock purchases and lab settlements come from the Pharmacy and Laboratory pages."
          >
            <select id="expense_cat" name="expense_cat" required defaultValue="" className={controlClass}>
              <option value="" disabled>Choose one</option>
              <option value="rent">Rent</option>
              <option value="electricity">Electricity</option>
              <option value="other">Other (wifi, oxygen, repairs…)</option>
            </select>
          </Field>

          <Field label="Amount" htmlFor="amount" required>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              className={controlClass}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Paid by" htmlFor="method" required>
              <select id="method" name="method" required defaultValue="cash" className={controlClass}>
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
                <option value="card">Card</option>
                <option value="other">Other</option>
              </select>
            </Field>

            <Field label="Paid on" htmlFor="occurred_on" required>
              <input
                id="occurred_on"
                name="occurred_on"
                type="date"
                required
                max={todayISO()}
                defaultValue={todayISO()}
                className={controlClass}
              />
            </Field>
          </div>

          <Field
            label="Particulars"
            htmlFor="description"
            required
            hint="What the money actually went on. A bare amount is impossible to check against a receipt months later."
          >
            <input
              id="description"
              name="description"
              required
              autoComplete="off"
              placeholder="WAPDA bill — September"
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
              {pending ? "Recording…" : "Record expense"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function ReverseExpenseButton({
  entryId,
  amount,
  description,
}: {
  entryId: string
  amount: number
  description: string
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useClosingAction(reverseExpense, () => setOpen(false))
  const { formRef, captureValues } = useFormValues(result)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Undo2 className="size-4" aria-hidden />
        Reverse
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Reverse this expense"
        description="The original entry stays on the record. A matching entry cancels it out."
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <input type="hidden" name="entry_id" value={entryId} />

          <p className="rounded-lg bg-muted px-3 py-2.5 text-base">
            <span className="font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(amount)}
            </span>{" "}
            — {description}
          </p>

          <Field
            label="Why it is being reversed"
            htmlFor="reason"
            required
            hint="Recorded against both entries, so the correction can be explained later."
          >
            <input id="reason" name="reason" required autoComplete="off" className={controlClass} />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Reversing…" : "Reverse expense"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
