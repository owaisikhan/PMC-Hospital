"use client"

import { useActionState, useEffect, useState } from "react"
import { Loader2, Pencil, Plus } from "lucide-react"

import { Dialog } from "@/components/ui/dialog"
import { Field, controlClass } from "@/components/ui/field"
import { FormMessage } from "@/components/ui/form-message"
import { useFormValues } from "@/hooks/use-form-values"
import { useToastOnResult } from "@/hooks/use-toast-on-result"
import { saveLab, saveLabTest, type ActionResult } from "@/lib/actions"

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted"

export interface LabRecord {
  id: string
  name: string
  isActive: boolean
}

export interface LabTestRecord {
  id: string
  name: string
  labId: string | null
  chargePrice: number
  costPrice: number
  isActive: boolean
}

function LabForm({ lab, onClose }: { lab?: LabRecord; onClose: () => void }) {
  const [result, dispatch, pending] = useActionState<ActionResult | null, FormData>(
    saveLab,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(onClose, 1400)
      return () => clearTimeout(timer)
    }
  }, [result, onClose])

  return (
    <form ref={formRef} action={dispatch} onSubmit={captureValues} className="flex flex-col gap-4">
      {lab ? <input type="hidden" name="lab_id" value={lab.id} /> : null}

      <Field label="Lab name" htmlFor="lab_name" required>
        <input
          id="lab_name"
          name="name"
          required
          autoComplete="off"
          placeholder="Chughtai Lab"
          defaultValue={lab?.name ?? ""}
          className={controlClass}
        />
      </Field>

      <label className="flex items-start gap-2.5 text-base">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={lab?.isActive ?? true}
          className="mt-0.5 size-5 shrink-0 rounded border-border"
        />
        <span>
          Still sending samples here
          <span className="block text-sm text-muted-foreground">
            Unticking hides it from the test dropdown without losing past orders.
          </span>
        </span>
      </label>

      <FormMessage result={result} />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={outlineButton}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
          {pending ? "Saving…" : lab ? "Save changes" : "Add lab"}
        </button>
      </div>
    </form>
  )
}

export function AddLabButton() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Plus className="size-4.5" aria-hidden />
        Add lab
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a lab"
        description="Where a sample goes when it is sent outside PMC."
      >
        <LabForm onClose={() => setOpen(false)} />
      </Dialog>
    </>
  )
}

export function EditLabButton({ lab }: { lab: LabRecord }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${lab.name}`}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Edit ${lab.name}`}>
        <LabForm lab={lab} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  )
}

function TestForm({
  test,
  labs,
  onClose,
}: {
  test?: LabTestRecord
  labs: LabRecord[]
  onClose: () => void
}) {
  const [result, dispatch, pending] = useActionState<ActionResult | null, FormData>(
    saveLabTest,
    null
  )
  const { formRef, captureValues } = useFormValues(result)
  useToastOnResult(result)

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(onClose, 1400)
      return () => clearTimeout(timer)
    }
  }, [result, onClose])

  return (
    <form ref={formRef} action={dispatch} onSubmit={captureValues} className="flex flex-col gap-4">
      {test ? <input type="hidden" name="test_id" value={test.id} /> : null}

      <Field label="Test name" htmlFor="test_name" required>
        <input
          id="test_name"
          name="name"
          required
          autoComplete="off"
          placeholder="Complete Blood Count (CBC)"
          defaultValue={test?.name ?? ""}
          className={controlClass}
        />
      </Field>

      <Field
        label="Lab"
        htmlFor="lab_id"
        required
        hint="Add the lab first, under Labs below, if it is not listed yet."
      >
        <select
          id="lab_id"
          name="lab_id"
          required
          defaultValue={test?.labId ?? ""}
          className={controlClass}
        >
          <option value="" disabled>
            Choose…
          </option>
          {labs.map((lab) => (
            <option key={lab.id} value={lab.id}>
              {lab.name}
              {lab.isActive ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Charge to patient"
          htmlFor="charge_price"
          required
          hint="What the family pays."
        >
          <input
            id="charge_price"
            name="charge_price"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
            defaultValue={test ? Math.round(test.chargePrice) : ""}
            className={controlClass}
          />
        </Field>

        <Field
          label="Cost to PMC"
          htmlFor="cost_price"
          required
          hint="What the lab bills PMC for this test."
        >
          <input
            id="cost_price"
            name="cost_price"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            defaultValue={test ? Math.round(test.costPrice) : ""}
            className={controlClass}
          />
        </Field>
      </div>

      <label className="flex items-start gap-2.5 text-base">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={test?.isActive ?? true}
          className="mt-0.5 size-5 shrink-0 rounded border-border"
        />
        <span>
          Offered
          <span className="block text-sm text-muted-foreground">
            Unticking hides it from the order form without touching past orders.
          </span>
        </span>
      </label>

      <FormMessage result={result} />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={outlineButton}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? <Loader2 className="size-4.5 animate-spin" aria-hidden /> : null}
          {pending ? "Saving…" : test ? "Save changes" : "Add test"}
        </button>
      </div>
    </form>
  )
}

export function AddTestButton({ labs }: { labs: LabRecord[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={primaryButton}>
        <Plus className="size-4.5" aria-hidden />
        Add test
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a test"
        description="The charge and cost apply to every order of this test from now on; an order already placed keeps the figures it was placed with."
      >
        <TestForm labs={labs} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  )
}

export function EditTestButton({ test, labs }: { test: LabTestRecord; labs: LabRecord[] }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Edit ${test.name}`}
        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${test.name}`}
        description="Changing the charge or cost does not change any order already placed."
      >
        <TestForm test={test} labs={labs} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  )
}
