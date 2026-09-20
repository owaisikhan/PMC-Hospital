"use client"

import { useActionState, useEffect, useState } from "react"
import { BedDouble, Loader2 } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { admitPatient, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"
import { formatAge, formatPKR } from "@/lib/format"

export interface PatientOption {
  id: string
  mrn: string
  fullName: string
  dateOfBirth: string
  isAdmitted: boolean
}

export interface WardOption {
  id: string
  name: string
}

export interface RateOption {
  id: string
  name: string
  amount: number
}

/**
 * One screen for the whole arrival: find the patient, or register them without
 * leaving, then choose ward and care level. Splitting this in two meant typing
 * a name, navigating away, then searching for the patient just created.
 */
export function AdmitDialog({
  patients,
  wards,
  rates,
}: {
  patients: PatientOption[]
  wards: WardOption[]
  rates: RateOption[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<PatientOption | null>(null)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    admitPatient,
    null
  )
  const { formRef, captureValues } = useFormValues(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => {
        setOpen(false)
        setSelected(null)
        setSearch("")
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [result])

  const term = search.trim().toLowerCase()
  const matches = term
    ? patients
        .filter(
          (p) =>
            p.fullName.toLowerCase().includes(term) || p.mrn.toLowerCase().includes(term)
        )
        .slice(0, 6)
    : []

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 items-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <BedDouble className="size-4.5" aria-hidden />
        Admit patient
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Admit a patient"
        description="Find the patient, then choose the ward and what is being charged."
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <Field
            label="Find the patient"
            htmlFor="patient_search"
            required
            hint="Type a name or medical record number."
          >
            <input
              id="patient_search"
              value={selected ? `${selected.fullName} · ${selected.mrn}` : search}
              onChange={(event) => {
                setSelected(null)
                setSearch(event.target.value)
              }}
              autoComplete="off"
              className={controlClass}
            />
          </Field>

          <input type="hidden" name="patient_id" value={selected?.id ?? ""} />

          {!selected && term ? (
            matches.length > 0 ? (
              <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto rounded-lg border border-border p-1">
                {matches.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      disabled={patient.isAdmitted}
                      onClick={() => setSelected(patient)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-base transition-colors hover:bg-muted disabled:opacity-50 disabled:hover:bg-transparent"
                    >
                      <span className="font-medium">{patient.fullName}</span>
                      <span className="text-base text-muted-foreground tabular-nums">
                        {patient.mrn} · {formatAge(patient.dateOfBirth)}
                        {patient.isAdmitted ? " · already admitted" : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-base text-muted-foreground">
                No patient matches. Register them on the Patients page first, then
                come back.
              </p>
            )
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Ward" htmlFor="ward_id" required>
              <select id="ward_id" name="ward_id" required defaultValue="" className={controlClass}>
                <option value="" disabled>
                  Choose…
                </option>
                {wards.map((ward) => (
                  <option key={ward.id} value={ward.id}>
                    {ward.name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Admitted on" htmlFor="admitted_on" required>
              <input
                id="admitted_on"
                name="admitted_on"
                type="date"
                required
                defaultValue={todayISO()}
                max={todayISO()}
                className={controlClass}
              />
            </Field>
          </div>

          <Field
            label="Care level charged"
            htmlFor="charge_rate_id"
            required
            hint="Charged for every day of the stay. CPAP or a ventilator can be added on top later."
          >
            <select
              id="charge_rate_id"
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

          <Field label="Diagnosis" htmlFor="diagnosis">
            <input id="diagnosis" name="diagnosis" autoComplete="off" className={controlClass} />
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
              disabled={pending || !selected}
              className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Admitting…" : "Admit patient"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
