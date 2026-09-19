"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, LogOut, Plus } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { addSupport, dischargePatient, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"
import { formatPKR } from "@/lib/format"
import type { RateOption } from "@/components/patients/admit-dialog"

const smallButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

export function AddSupportButton({
  admissionId,
  admittedOn,
  rates,
}: {
  admissionId: string
  admittedOn: string
  rates: RateOption[]
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    addSupport,
    null
  )

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1200)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={smallButton}>
        <Plus className="size-4.5" aria-hidden />
        Add support
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add support to this stay"
        description="Charged per day for the dates you give, on top of the ward charge."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="admission_id" value={admissionId} />

          <Field label="Support given" htmlFor="support_rate" required>
            <select
              id="support_rate"
              name="charge_rate_id"
              required
              defaultValue=""
              className={controlClass}
            >
              <option value="" disabled>
                Choose…
              </option>
              {rates.map((rate) => (
                <option key={rate.id} value={rate.id}>
                  {rate.name} — {formatPKR(rate.amount)}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Started on" htmlFor="from_date" required>
              <input
                id="from_date"
                name="from_date"
                type="date"
                required
                min={admittedOn}
                max={todayISO()}
                defaultValue={todayISO()}
                className={controlClass}
              />
            </Field>

            <Field
              label="Ended on"
              htmlFor="to_date"
              hint="Leave empty while it is still running."
            >
              <input
                id="to_date"
                name="to_date"
                type="date"
                min={admittedOn}
                max={todayISO()}
                className={controlClass}
              />
            </Field>
          </div>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={smallButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Adding…" : "Add support"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function DischargeButton({
  admissionId,
  patientName,
  admittedOn,
  runningTotal,
}: {
  admissionId: string
  patientName: string
  admittedOn: string
  runningTotal: number
}) {
  const [open, setOpen] = useState(false)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    dischargePatient,
    null
  )

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => setOpen(false), 1400)
      return () => clearTimeout(timer)
    }
  }, [result])

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={smallButton}>
        <LogOut className="size-4.5" aria-hidden />
        Discharge
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Discharge ${patientName}?`}
        description="Charges stop on the discharge date. The bill stays on record."
      >
        <form action={action} className="flex flex-col gap-4">
          <input type="hidden" name="admission_id" value={admissionId} />

          <p className="rounded-lg bg-muted px-3 py-2.5 text-base">
            Current bill:{" "}
            <span className="font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(runningTotal)}
            </span>
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Discharged on" htmlFor="discharged_on" required>
              <input
                id="discharged_on"
                name="discharged_on"
                type="date"
                required
                min={admittedOn}
                max={todayISO()}
                defaultValue={todayISO()}
                className={controlClass}
              />
            </Field>

            <Field label="Outcome" htmlFor="status" required>
              <select
                id="status"
                name="status"
                required
                defaultValue="discharged"
                className={controlClass}
              >
                <option value="discharged">Discharged home</option>
                <option value="referred">Referred elsewhere</option>
                <option value="lama">Left against medical advice</option>
                <option value="expired">Died</option>
              </select>
            </Field>
          </div>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={smallButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Discharging…" : "Confirm discharge"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
