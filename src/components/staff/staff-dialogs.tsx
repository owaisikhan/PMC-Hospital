"use client";

import { useActionState, useEffect, useState } from "react";
import { Loader2, Pencil, UserPlus } from "lucide-react";

import { Dialog } from "@/components/ui/dialog";
import { Field, controlClass } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useFormValues } from "@/hooks/use-form-values";
import { saveStaff, type ActionResult } from "@/lib/actions";
import { todayISO } from "@/lib/dates";

const primaryButton =
  "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60";
const outlineButton =
  "flex h-11 items-center gap-2 rounded-lg border border-border px-3.5 text-base font-medium transition-colors hover:bg-muted";

export interface StaffRecord {
  id: string;
  fullName: string;
  designation: string;
  monthlySalary: number;
  phone: string | null;
  joinedOn: string;
  isActive: boolean;
}

function StaffForm({
  staff,
  onClose,
}: {
  staff?: StaffRecord;
  onClose: () => void;
}) {
  const [result, dispatch, pending] = useActionState<
    ActionResult | null,
    FormData
  >(saveStaff, null);
  const { formRef, captureValues } = useFormValues(result);

  useEffect(() => {
    if (result?.ok) {
      const timer = setTimeout(onClose, 1600);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  return (
    <form
      ref={formRef}
      action={dispatch}
      onSubmit={captureValues}
      className="flex flex-col gap-4"
    >
      {staff ? <input type="hidden" name="staff_id" value={staff.id} /> : null}

      <Field label="Name" htmlFor="full_name" required>
        <input
          id="full_name"
          name="full_name"
          required
          autoComplete="off"
          defaultValue={staff?.fullName ?? ""}
          className={controlClass}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Designation" htmlFor="designation" required>
          <input
            id="designation"
            name="designation"
            required
            autoComplete="off"
            placeholder="Staff Nurse"
            defaultValue={staff?.designation ?? ""}
            className={controlClass}
          />
        </Field>

        <Field
          label="Monthly salary"
          htmlFor="monthly_salary"
          required
          hint="The agreed figure. Each month's actual payment is recorded separately."
        >
          <input
            id="monthly_salary"
            name="monthly_salary"
            type="number"
            min="0"
            step="1"
            inputMode="numeric"
            required
            defaultValue={staff ? Math.round(staff.monthlySalary) : ""}
            className={controlClass}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Phone" htmlFor="phone">
          <input
            id="phone"
            name="phone"
            inputMode="tel"
            autoComplete="off"
            defaultValue={staff?.phone ?? ""}
            className={controlClass}
          />
        </Field>

        <Field label="Joined on" htmlFor="joined_on" required>
          <input
            id="joined_on"
            name="joined_on"
            type="date"
            required
            max={todayISO()}
            defaultValue={staff?.joinedOn ?? todayISO()}
            className={controlClass}
          />
        </Field>
      </div>

      <label className="flex items-center gap-2.5 text-base">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={staff?.isActive ?? true}
          className="size-5 rounded border-border"
        />
        Still working at PMC
        <span className="text-sm text-muted-foreground">
          — unticking keeps the record and stops them appearing in the salary
          run
        </span>
      </label>

      <FormMessage result={result} />

      <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} className={outlineButton}>
          Cancel
        </button>
        <button type="submit" disabled={pending} className={primaryButton}>
          {pending ? (
            <Loader2 className="size-4.5 animate-spin" aria-hidden />
          ) : null}
          {pending ? "Saving…" : staff ? "Save changes" : "Add staff member"}
        </button>
      </div>
    </form>
  );
}

export function AddStaffButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={primaryButton}
      >
        <UserPlus className="size-4.5" aria-hidden />
        Add staff member
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Add a staff member"
        description="Their agreed salary is what the monthly salary run fills in."
      >
        <StaffForm onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}

export function EditStaffButton({ staff }: { staff: StaffRecord }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Pencil className="size-4" aria-hidden />
        Edit
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Edit ${staff.fullName}`}
        description="Changing the agreed salary does not change salaries already paid."
      >
        <StaffForm staff={staff} onClose={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
