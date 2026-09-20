"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Wallet } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { paySalary, type ActionResult } from "@/lib/actions"
import { monthLabel, todayISO } from "@/lib/dates"
import { formatPKR } from "@/lib/format"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

export function PaySalaryButton({
  staffId,
  staffName,
  designation,
  monthlySalary,
  outstanding,
  forMonth,
}: {
  staffId: string
  staffName: string
  designation: string
  monthlySalary: number
  /** What is still owed for the month, once earlier instalments are counted. */
  outstanding: number
  /** Month start, e.g. "2026-09-01". */
  forMonth: string
}) {
  // Part way through a month's salary, the useful default is the rest of it,
  // not the whole figure again.
  const partPaid = outstanding < monthlySalary
  const [open, setOpen] = useState(false)
  const [result, dispatch, pending] = useActionState<ActionResult | null, FormData>(
    paySalary,
    null
  )
  const { formRef, captureValues } = useFormValues(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1600)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <Wallet className="size-4" aria-hidden />
        {partPaid ? "Pay rest" : "Pay"}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Pay ${staffName}`}
        description={
          partPaid
            ? `${formatPKR(outstanding)} of this salary is still owed for ${monthLabel(forMonth)}. This writes another expense to the ledger, which cannot be edited afterwards — only reversed.`
            : `Salary for ${monthLabel(forMonth)}. This writes an expense to the ledger, which cannot be edited afterwards — only reversed.`
        }
      >
        <form ref={formRef} action={dispatch} onSubmit={captureValues} className="flex flex-col gap-4">
          <input type="hidden" name="staff_id" value={staffId} />
          <input type="hidden" name="for_month" value={forMonth} />

          <p className="rounded-lg bg-muted px-3 py-2.5 text-base">
            {designation} · agreed salary{" "}
            <span className="font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(monthlySalary)}
            </span>
            {partPaid ? (
              <>
                {" · already paid "}
                <span className="font-semibold whitespace-nowrap tabular-nums">
                  {formatPKR(monthlySalary - outstanding)}
                </span>
              </>
            ) : null}
          </p>

          <Field
            label="Amount paid"
            htmlFor="amount"
            required
            hint="Change it for a part payment or a bonus. The agreed salary on the staff record does not change."
          >
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              defaultValue={Math.round(outstanding)}
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

            <Field label="Paid on" htmlFor="paid_on" required>
              <input
                id="paid_on"
                name="paid_on"
                type="date"
                required
                max={todayISO()}
                defaultValue={todayISO()}
                className={controlClass}
              />
            </Field>
          </div>

          <Field label="Note" htmlFor="description">
            <input
              id="description"
              name="description"
              autoComplete="off"
              placeholder="Includes Eid bonus"
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
              {pending ? "Paying…" : "Record payment"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
