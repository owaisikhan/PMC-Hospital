"use server"

import { revalidatePath } from "next/cache"

import { todayISO } from "@/lib/dates"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

/** Every action returns this shape, so one message component renders them all. */
export interface ActionResult {
  ok: boolean
  message: string
  /** Set on success where the caller needs to follow the new row. */
  id?: string
}

function fail(message: string): ActionResult {
  return { ok: false, message }
}

/**
 * Database errors reach the person entering data, so they are rewritten as
 * something that says what to do. Anything unrecognised is passed through
 * rather than swallowed - a vague "something went wrong" is worse than a
 * technical message a person can read out over the phone.
 */
function describeDbError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes("patients_mrn_key") || m.includes("duplicate key") && m.includes("mrn")) {
    return "That medical record number is already in use. Try saving again."
  }
  if (m.includes("date of birth cannot be in the future")) {
    return message
  }
  if (m.includes("admissions_discharge_after_admit")) {
    return "The discharge date cannot be before the admission date."
  }
  if (m.includes("admission_services_range")) {
    return "The end date cannot be before the start date."
  }
  if (m.includes("row-level security") || m.includes("permission denied")) {
    return "You do not have permission to do this. Ask the administrator."
  }
  return message
}

function text(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim()
}

// ---------------------------------------------------------------------------
// Patients
// ---------------------------------------------------------------------------

export async function registerPatient(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const fullName = text(form, "full_name")
  const dateOfBirth = text(form, "date_of_birth")
  const gender = text(form, "gender")

  if (!fullName) return fail("Enter the child's name.")
  if (!dateOfBirth) return fail("Enter the date of birth.")
  if (dateOfBirth > todayISO()) return fail("Date of birth cannot be in the future.")
  if (!["male", "female", "other"].includes(gender)) return fail("Choose the gender.")

  const { data, error } = await supabase
    .from("patients")
    .insert({
      full_name: fullName,
      father_name: text(form, "father_name") || null,
      date_of_birth: dateOfBirth,
      gender,
      guardian_phone: text(form, "guardian_phone") || null,
      address: text(form, "address") || null,
      created_by: profile.id,
    })
    .select("id, mrn, full_name")
    .single()

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/patients")
  revalidatePath("/")
  return { ok: true, message: `${data.full_name} registered as ${data.mrn}.`, id: data.id }
}

// ---------------------------------------------------------------------------
// Admissions
// ---------------------------------------------------------------------------

export async function admitPatient(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const patientId = text(form, "patient_id")
  const wardId = text(form, "ward_id")
  const chargeRateId = text(form, "charge_rate_id")
  const admittedOn = text(form, "admitted_on") || todayISO()

  if (!patientId) return fail("Choose the child being admitted.")
  if (!wardId) return fail("Choose a ward.")
  if (!chargeRateId) return fail("Choose the care level being charged.")
  if (admittedOn > todayISO()) return fail("The admission date cannot be in the future.")

  const { data: openStay } = await supabase
    .from("admissions")
    .select("id")
    .eq("patient_id", patientId)
    .is("discharged_on", null)
    .maybeSingle()

  if (openStay) {
    return fail("This child is already admitted. Discharge the current stay first.")
  }

  const { data: admission, error: admitError } = await supabase
    .from("admissions")
    .insert({
      patient_id: patientId,
      ward_id: wardId,
      admitted_on: admittedOn,
      diagnosis: text(form, "diagnosis") || null,
      created_by: profile.id,
    })
    .select("id")
    .single()

  if (admitError) return fail(describeDbError(admitError.message))

  const result = await addAdmissionService({
    admissionId: admission.id,
    chargeRateId,
    fromDate: admittedOn,
    profileId: profile.id,
  })

  if (!result.ok) return result

  revalidatePath("/patients", "layout")
  revalidatePath("/")
  return { ok: true, message: "Admitted.", id: admission.id }
}

/**
 * Attaches a care level to a stay for a date range. The rate is copied onto the
 * row, so editing the rate later never rewrites a bill already raised.
 */
async function addAdmissionService({
  admissionId,
  chargeRateId,
  fromDate,
  toDate,
  profileId,
}: {
  admissionId: string
  chargeRateId: string
  fromDate: string
  toDate?: string | null
  profileId: string
}): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: rate, error: rateError } = await supabase
    .from("charge_rates")
    .select("amount")
    .eq("id", chargeRateId)
    .single()

  if (rateError || !rate) return fail("That care level no longer exists.")

  const { error } = await supabase.from("admission_services").insert({
    admission_id: admissionId,
    charge_rate_id: chargeRateId,
    rate_amount: rate.amount,
    from_date: fromDate,
    to_date: toDate ?? null,
    created_by: profileId,
  })

  if (error) return fail(describeDbError(error.message))
  return { ok: true, message: "Added." }
}

export async function addSupport(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()

  const admissionId = text(form, "admission_id")
  const chargeRateId = text(form, "charge_rate_id")
  const fromDate = text(form, "from_date")
  const toDate = text(form, "to_date")

  if (!admissionId || !chargeRateId) return fail("Choose the support being added.")
  if (!fromDate) return fail("Enter the date it started.")
  if (toDate && toDate < fromDate) return fail("The end date cannot be before the start date.")

  const result = await addAdmissionService({
    admissionId,
    chargeRateId,
    fromDate,
    toDate: toDate || null,
    profileId: profile.id,
  })

  if (!result.ok) return result

  revalidatePath("/patients", "layout")
  return { ok: true, message: "Support added to this stay." }
}

export async function dischargePatient(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  await requireProfile()
  const supabase = await createClient()

  const admissionId = text(form, "admission_id")
  const dischargedOn = text(form, "discharged_on") || todayISO()
  const status = text(form, "status") || "discharged"

  if (!admissionId) return fail("Missing the admission.")
  if (dischargedOn > todayISO()) return fail("The discharge date cannot be in the future.")

  const { error } = await supabase
    .from("admissions")
    .update({ discharged_on: dischargedOn, status })
    .eq("id", admissionId)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/patients", "layout")
  revalidatePath("/")
  return { ok: true, message: "Discharged. The final bill is shown on the stay." }
}
