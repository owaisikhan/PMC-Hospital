"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Percent, Undo2, Wallet } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import {
  applyDiscount,
  recordPayment,
  reversePayment,
  type ActionResult,
} from "@/lib/actions"
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
  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(onDone, 1600)
      return () => clearTimeout(timer)
    }
  }, [result, onDone])
  return [result, dispatch, pending] as const
}

export function RecordPaymentButton({
  admissionId,
  patientId,
  patientName,
  balance,
}: {
  admissionId: string
  patientId: string
  patientName: string
  balance: number
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useClosingAction(recordPayment, () => setOpen(false))

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Wallet className="size-4.5" aria-hidden />
        Record payment
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Payment from ${patientName}`}
        description="Cash received now. Corrections are made by reversing, never by editing."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="admission_id" value={admissionId} />
          <input type="hidden" name="patient_id" value={patientId} />

          <p className="rounded-lg bg-muted px-3 py-2.5 text-base">
            Still owed:{" "}
            <span className="font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(balance)}
            </span>
          </p>

          <Field
            label="Amount received"
            htmlFor="amount"
            required
            hint="More than the balance is allowed — it is recorded as an advance."
          >
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              defaultValue={balance > 0 ? Math.round(balance) : ""}
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

            <Field label="Received on" htmlFor="occurred_on" required>
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

          <Field label="Note" htmlFor="description">
            <input id="description" name="description" autoComplete="off" className={controlClass} />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Recording…" : "Record payment"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function DiscountButton({
  admissionId,
  patientName,
  balance,
}: {
  admissionId: string
  patientName: string
  balance: number
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useClosingAction(applyDiscount, () => setOpen(false))

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={outlineButton}>
        <Percent className="size-4.5" aria-hidden />
        Give concession
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Concession for ${patientName}`}
        description="Reduces the bill without recording money. It is never counted as income."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="admission_id" value={admissionId} />

          <p className="rounded-lg bg-muted px-3 py-2.5 text-base">
            Still owed:{" "}
            <span className="font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(balance)}
            </span>
          </p>

          <Field label="Concession amount" htmlFor="discount_amount" required>
            <input
              id="discount_amount"
              name="amount"
              type="number"
              min="1"
              step="1"
              inputMode="numeric"
              required
              className={controlClass}
            />
          </Field>

          <Field
            label="Reason"
            htmlFor="reason"
            required
            hint="Shown on the record, so it is clear later why the bill was reduced."
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
              {pending ? "Saving…" : "Give concession"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function ReversePaymentButton({
  paymentId,
  amount,
}: {
  paymentId: string
  amount: number
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useClosingAction(reversePayment, () => setOpen(false))

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Undo2 className="size-4" aria-hidden />
        Reverse
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Reverse ${formatPKR(amount)}?`}
        description="The original payment stays on record. A matching reversal is added beside it."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="payment_id" value={paymentId} />

          <Field
            label="Why is it being reversed?"
            htmlFor="reverse_reason"
            required
            hint="Entered twice, wrong amount, refunded to the family, and so on."
          >
            <input id="reverse_reason" name="reason" required autoComplete="off" className={controlClass} />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-destructive/12 px-4 text-base font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Reversing…" : "Reverse payment"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
