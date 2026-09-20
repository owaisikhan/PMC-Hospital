"use client"

import { useActionState, useEffect, useState } from "react"
import { FlaskConical, Loader2, PencilLine } from "lucide-react"

import type { PatientOption } from "@/components/patients/admit-dialog"
import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { recordLabOrder, updateLabOrder, type ActionResult } from "@/lib/actions"
import { todayISO } from "@/lib/dates"
import { formatAge, formatPKR } from "@/lib/format"
import { LAB_STATUS_LABELS, type LabStatus } from "@/lib/lab"

export interface TestOption {
  id: string
  name: string
  externalLab: string | null
  chargePrice: number
}

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

export function NewLabOrderButton({
  patients,
  tests,
}: {
  patients: PatientOption[]
  tests: TestOption[]
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<PatientOption | null>(null)
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    recordLabOrder,
    null
  )
  const { formRef, captureValues } = useFormValues(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(() => {
        setOpen(false)
        setSelected(null)
        setSearch("")
      }, 1400)
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
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <FlaskConical className="size-4.5" aria-hidden />
        New lab order
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Order a lab test"
        description="Tests are sent to an outside lab. The price is fixed at the moment of ordering."
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <Field
            label="Find the child"
            htmlFor="lab_patient_search"
            required
            hint="Type a name or medical record number."
          >
            <input
              id="lab_patient_search"
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
              <ul className="flex flex-col gap-1 rounded-lg border border-border p-1">
                {matches.map((patient) => (
                  <li key={patient.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(patient)}
                      className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2.5 text-left text-base transition-colors hover:bg-muted"
                    >
                      <span className="font-medium">{patient.fullName}</span>
                      <span className="text-base text-muted-foreground tabular-nums">
                        {patient.mrn} · {formatAge(patient.dateOfBirth)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-lg bg-muted px-3 py-2.5 text-base text-muted-foreground">
                No child matches. Register them on the Patients page first.
              </p>
            )
          ) : null}

          <Field label="Test" htmlFor="test_id" required>
            <select id="test_id" name="test_id" required defaultValue="" className={controlClass}>
              <option value="" disabled>
                Choose…
              </option>
              {tests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.name} — {formatPKR(test.chargePrice)}
                  {test.externalLab ? ` · ${test.externalLab}` : ""}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Ordered on" htmlFor="ordered_on" required>
            <input
              id="ordered_on"
              name="ordered_on"
              type="date"
              required
              max={todayISO()}
              defaultValue={todayISO()}
              className={controlClass}
            />
          </Field>

          <label className="flex items-start gap-2.5 rounded-lg bg-muted px-3 py-2.5 text-base">
            <input
              type="checkbox"
              name="paid_now"
              defaultChecked
              className="mt-1 size-4.5 shrink-0 rounded border-input"
            />
            <span>
              Payment taken now
              <span className="block text-sm text-muted-foreground">
                Records the charge as income today. Untick if the family will pay later.
              </span>
            </span>
          </label>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending || !selected}
              className={primaryButton}
            >
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Ordering…" : "Order test"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}

export function UpdateLabOrderButton({
  orderId,
  testName,
  patientName,
  status,
  resultNote,
}: {
  orderId: string
  testName: string
  patientName: string
  status: LabStatus
  resultNote: string | null
}) {
  const [open, setOpen] = useState(false)
  const [nextStatus, setNextStatus] = useState<LabStatus>(status)
  const [note, setNote] = useState(resultNote ?? "")
  const [result, action, pending] = useActionState<ActionResult | null, FormData>(
    updateLabOrder,
    null
  )
  const { formRef, captureValues } = useFormValues(result)

  // Field values survive a refusal via useFormValues; this only closes the
  // dialog once the database has accepted the change.
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
        aria-label={`Update ${testName} for ${patientName}`}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <PencilLine className="size-4" aria-hidden />
        Update
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={testName}
        description={`For ${patientName}.`}
      >
        <form ref={formRef} action={action} onSubmit={captureValues} className="flex flex-col gap-4">
          <input type="hidden" name="order_id" value={orderId} />

          <Field label="Status" htmlFor="lab_status" required>
            <select
              id="lab_status"
              name="status"
              required
              value={nextStatus}
              onChange={(event) => setNextStatus(event.target.value as LabStatus)}
              className={controlClass}
            >
              {(Object.keys(LAB_STATUS_LABELS) as LabStatus[]).map((key) => (
                <option key={key} value={key}>
                  {LAB_STATUS_LABELS[key]}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Result"
            htmlFor="result_note"
            required={nextStatus === "resulted"}
            hint="What the lab reported, in the words you would write on the file."
          >
            <textarea
              id="result_note"
              name="result_note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`${controlClass} h-auto py-2.5`}
            />
          </Field>

          <FormMessage result={result} />

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setOpen(false)} className={outlineButton}>
              Cancel
            </button>
            <button type="submit" disabled={pending} className={primaryButton}>
              {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </Dialog>
    </>
  )
}
