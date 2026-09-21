"use server"

import { revalidatePath } from "next/cache"

import { staffEmailFor, USERNAME_PATTERN } from "@/lib/auth"
import { todayISO } from "@/lib/dates"
import { createAdminClient } from "@/lib/supabase/admin"
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
  if (m.includes("ledger_entries_amount_check")) {
    return "The amount must be more than zero."
  }
  if (m.includes("last_admin")) {
    return "At least one administrator has to stay active — promote or reactivate someone else first."
  }
  if (m.includes("pharmacy_batches_remaining_lte_received")) {
    return "That is more than actually arrived in this batch."
  }
  if (m.includes("labs_name_key") || (m.includes("duplicate key") && m.includes("labs"))) {
    return "A lab with that name already exists."
  }
  if (m.includes("lab_tests_name_key")) {
    return "A test with that name already exists."
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

  if (!fullName) return fail("Enter the patient's name.")
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

  if (!patientId) return fail("Choose the patient being admitted.")
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
    return fail("This patient is already admitted. Discharge the current stay first.")
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

// ---------------------------------------------------------------------------
// Billing
// ---------------------------------------------------------------------------

/** Charges, concessions, payments and what is still owed for one stay. */
async function balanceFor(admissionId: string) {
  const supabase = await createClient()
  const { data } = await supabase.rpc("admission_balances")
  const rows = (data ?? []) as {
    admission_id: string
    total_charges: number | string
    total_discount: number | string
    total_paid: number | string
    balance: number | string
  }[]
  return rows.find((row) => row.admission_id === admissionId) ?? null
}

export async function recordPayment(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const admissionId = text(form, "admission_id")
  const patientId = text(form, "patient_id")
  const amount = Number(text(form, "amount"))
  const method = text(form, "method") || "cash"
  const occurredOn = text(form, "occurred_on") || todayISO()

  if (!admissionId) return fail("Missing the stay this payment is for.")
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Enter how much was received. It must be more than zero.")
  }
  if (occurredOn > todayISO()) return fail("The payment date cannot be in the future.")

  const { error } = await supabase.from("ledger_entries").insert({
    direction: "in",
    income_cat: "admission",
    amount,
    method,
    occurred_on: occurredOn,
    description: text(form, "description") || null,
    patient_id: patientId || null,
    admission_id: admissionId,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/billing")
  revalidatePath("/patients", "layout")
  revalidatePath("/")

  const balance = await balanceFor(admissionId)
  const remaining = balance ? Number(balance.balance) : null

  if (remaining !== null && remaining <= 0) {
    return { ok: true, message: "Payment recorded. This bill is now settled." }
  }
  return {
    ok: true,
    message:
      remaining === null
        ? "Payment recorded."
        : `Payment recorded. Rs ${remaining.toLocaleString("en-PK")} still owed.`,
  }
}

/**
 * A concession never touches the ledger: money not received is not income.
 * Admin only, because reducing what a family owes is a money decision.
 */
export async function applyDiscount(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can give a concession.")
  }

  const supabase = await createClient()
  const admissionId = text(form, "admission_id")
  const amount = Number(text(form, "amount"))
  const reason = text(form, "reason")

  if (!admissionId) return fail("Missing the stay.")
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Enter the concession amount. It must be more than zero.")
  }
  if (!reason) return fail("Give a reason for the concession — it goes on the record.")

  // A concession larger than what is still owed would leave the family in
  // credit for money that never changed hands, so it is refused rather than
  // quietly clamped.
  const balance = await balanceFor(admissionId)
  if (balance && amount > Number(balance.balance)) {
    return fail(
      `That is more than the Rs ${Number(balance.balance).toLocaleString("en-PK")} still owed on this stay.`
    )
  }

  const { error } = await supabase.from("admission_discounts").insert({
    admission_id: admissionId,
    amount,
    reason,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/billing")
  revalidatePath("/patients", "layout")
  return { ok: true, message: "Concession recorded against this bill." }
}

/**
 * Corrections are reversals, never edits or deletes — the ledger is
 * append-only, and the database refuses anything else.
 */
export async function reversePayment(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can reverse a payment.")
  }

  const supabase = await createClient()
  const paymentId = text(form, "payment_id")
  const reason = text(form, "reason")

  if (!paymentId) return fail("Missing the payment.")
  if (!reason) return fail("Say why this payment is being reversed — it goes on the record.")

  const { data: original, error: readError } = await supabase
    .from("ledger_entries")
    .select("id, amount, admission_id, patient_id")
    .eq("id", paymentId)
    .single()

  if (readError || !original) return fail("That payment could not be found.")

  const { error } = await supabase.from("ledger_entries").insert({
    direction: "out",
    expense_cat: "other",
    amount: original.amount,
    occurred_on: todayISO(),
    description: `Reversal: ${reason}`,
    patient_id: original.patient_id,
    admission_id: original.admission_id,
    reverses_id: original.id,
    reversal_reason: reason,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/billing")
  revalidatePath("/patients", "layout")
  revalidatePath("/")
  return { ok: true, message: "Payment reversed. The original stays on record." }
}

// ---------------------------------------------------------------------------
// Laboratory
// ---------------------------------------------------------------------------

const LAB_STATUSES = ["ordered", "sample_sent", "resulted", "cancelled"] as const

export async function recordLabOrder(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const patientId = text(form, "patient_id")
  const testId = text(form, "test_id")
  const orderedOn = text(form, "ordered_on") || todayISO()
  const paidNow = form.get("paid_now") === "on"

  if (!patientId) return fail("Choose the patient the test is for.")
  if (!testId) return fail("Choose the test.")
  if (orderedOn > todayISO()) return fail("The order date cannot be in the future.")

  // The prices — and the lab's name at the time — are copied onto the
  // order, so changing a test's price or lab later never rewrites what an
  // earlier family was charged or where their sample actually went.
  const { data: test, error: testError } = await supabase
    .from("lab_tests")
    .select("name, charge_price, cost_price, labs(name)")
    .eq("id", testId)
    .single()

  if (testError || !test) return fail("That test no longer exists.")
  const labName = (test.labs as unknown as { name: string } | null)?.name ?? null

  // If the patient is currently admitted, attach the order to that stay so it
  // shows on their record.
  const { data: openStay } = await supabase
    .from("admissions")
    .select("id")
    .eq("patient_id", patientId)
    .is("discharged_on", null)
    .maybeSingle()

  const { data: order, error } = await supabase
    .from("lab_orders")
    .insert({
      patient_id: patientId,
      admission_id: openStay?.id ?? null,
      test_id: testId,
      ordered_on: orderedOn,
      status: "ordered",
      charge_amount: test.charge_price,
      cost_amount: test.cost_price,
      external_lab: labName,
      created_by: profile.id,
    })
    .select("id")
    .single()

  if (error) return fail(describeDbError(error.message))

  if (paidNow && Number(test.charge_price) > 0) {
    // Deliberately no admission_id: a lab charge is not a payment against the
    // ward bill, and attaching it there would reduce what the family owes.
    const { error: ledgerError } = await supabase.from("ledger_entries").insert({
      direction: "in",
      income_cat: "lab",
      amount: test.charge_price,
      occurred_on: orderedOn,
      method: "cash",
      description: `Lab test: ${test.name}`,
      patient_id: patientId,
      lab_order_id: order.id,
      created_by: profile.id,
    })
    if (ledgerError) {
      return {
        ok: true,
        message: `Test ordered, but the payment was not recorded: ${describeDbError(ledgerError.message)}`,
      }
    }
  }

  revalidatePath("/laboratory")
  revalidatePath("/")
  return {
    ok: true,
    message: paidNow ? "Test ordered and payment recorded." : "Test ordered.",
  }
}

export async function updateLabOrder(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  await requireProfile()
  const supabase = await createClient()

  const orderId = text(form, "order_id")
  const status = text(form, "status")
  const resultNote = text(form, "result_note")

  if (!orderId) return fail("Missing the order.")
  if (!LAB_STATUSES.includes(status as (typeof LAB_STATUSES)[number])) {
    return fail("Choose a valid status.")
  }
  if (status === "resulted" && !resultNote) {
    return fail("Enter the result before marking the test as resulted.")
  }

  const { error } = await supabase
    .from("lab_orders")
    .update({ status, result_note: resultNote || null })
    .eq("id", orderId)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/laboratory")
  return { ok: true, message: "Test updated." }
}

/** Admin only — this is where charge_price and cost_price are set. */
export async function saveLabTest(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can manage tests.")

  const supabase = await createClient()
  const testId = text(form, "test_id")
  const name = text(form, "name")
  const labId = text(form, "lab_id")
  const chargePrice = Number(text(form, "charge_price"))
  const costPrice = Number(text(form, "cost_price"))
  const isActive = form.get("is_active") !== null

  if (!name) return fail("Enter the test's name.")
  if (!labId) return fail("Choose which lab runs this test.")
  if (!Number.isFinite(chargePrice) || chargePrice <= 0) {
    return fail("Enter what the patient is charged. It must be more than zero.")
  }
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return fail("Enter what the lab bills PMC. It cannot be negative.")
  }

  const row = {
    name,
    lab_id: labId,
    charge_price: chargePrice,
    cost_price: costPrice,
    is_active: isActive,
  }

  const { error } = testId
    ? await supabase.from("lab_tests").update(row).eq("id", testId)
    : await supabase.from("lab_tests").insert(row)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/laboratory")
  return { ok: true, message: testId ? "Test updated." : `${name} added.` }
}

/** Admin only. A lab is never deleted, only deactivated — every test and
 * past order that names it has to stay readable. */
export async function saveLab(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can manage labs.")

  const supabase = await createClient()
  const labId = text(form, "lab_id")
  const name = text(form, "name")
  const isActive = form.get("is_active") !== null

  if (!name) return fail("Enter the lab's name.")

  const row = { name, is_active: isActive }

  const { error } = labId
    ? await supabase.from("labs").update(row).eq("id", labId)
    : await supabase.from("labs").insert(row)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/laboratory")
  return { ok: true, message: labId ? "Lab updated." : `${name} added.` }
}

// ---------------------------------------------------------------------------
// Pharmacy (admin only — cost prices and stock counts are money)
// ---------------------------------------------------------------------------

/**
 * Receives a delivery: a new batch, and — when the medicine has never been
 * stocked before — the item itself in the same call. Never touches an
 * existing batch; a second delivery of something already on the shelf is a
 * new batch, even same-day, so each one's own cost price stays attached to
 * the stock it actually paid for.
 */
export async function receiveStock(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can receive stock.")

  const supabase = await createClient()
  const itemId = text(form, "item_id")
  const newItemName = text(form, "new_item_name")
  const form_ = text(form, "form")
  const strength = text(form, "strength")
  const unit = text(form, "unit") || "unit"
  const reorderLevel = Number(text(form, "reorder_level") || "0")

  const batchNo = text(form, "batch_no")
  const qtyReceived = Number(text(form, "qty_received"))
  const costPrice = Number(text(form, "cost_price"))
  const salePrice = Number(text(form, "sale_price"))
  const expiryDate = text(form, "expiry_date")
  const receivedOn = text(form, "received_on") || todayISO()

  if (!itemId && !newItemName) return fail("Choose a medicine, or enter a new one.")
  if (!batchNo) return fail("Enter the batch number.")
  if (!Number.isFinite(qtyReceived) || qtyReceived <= 0) {
    return fail("Enter how many units arrived. It must be more than zero.")
  }
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return fail("Enter what this batch cost. It cannot be negative.")
  }
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return fail("Enter the sale price. It cannot be negative.")
  }
  if (!expiryDate) return fail("Enter the expiry date.")
  if (expiryDate <= receivedOn) return fail("The expiry date has to be after today.")

  let resolvedItemId = itemId
  if (!resolvedItemId) {
    const { data: newItem, error: itemError } = await supabase
      .from("pharmacy_items")
      .insert({
        name: newItemName,
        form: form_ || null,
        strength: strength || null,
        unit,
        reorder_level: Number.isFinite(reorderLevel) ? reorderLevel : 0,
      })
      .select("id")
      .single()
    if (itemError) return fail(describeDbError(itemError.message))
    resolvedItemId = newItem.id
  }

  const { error } = await supabase.from("pharmacy_batches").insert({
    item_id: resolvedItemId,
    batch_no: batchNo,
    qty_received: qtyReceived,
    qty_remaining: qtyReceived,
    cost_price: costPrice,
    sale_price: salePrice,
    expiry_date: expiryDate,
    received_on: receivedOn,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/pharmacy")
  return { ok: true, message: "Stock received." }
}

/**
 * Corrects a batch already on the shelf — a mistyped price, an expiry date
 * entered wrong, a recount. This is the one exception to "never edit a
 * batch" above: it fixes a batch's own record of itself rather than
 * layering a new delivery on top, for a mistake made entering it, not stock
 * that actually moved (a sale is what changes qty_remaining day to day).
 */
export async function updateBatch(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can edit stock.")

  const supabase = await createClient()
  const batchId = text(form, "batch_id")
  const batchNo = text(form, "batch_no")
  const qtyRemaining = Number(text(form, "qty_remaining"))
  const costPrice = Number(text(form, "cost_price"))
  const salePrice = Number(text(form, "sale_price"))
  const expiryDate = text(form, "expiry_date")

  if (!batchId) return fail("Missing the batch.")
  if (!batchNo) return fail("Enter the batch number.")
  if (!Number.isFinite(qtyRemaining) || qtyRemaining < 0) {
    return fail("Enter how many units remain. It cannot be negative.")
  }
  if (!Number.isFinite(costPrice) || costPrice < 0) {
    return fail("Enter the cost price. It cannot be negative.")
  }
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    return fail("Enter the sale price. It cannot be negative.")
  }
  if (!expiryDate) return fail("Enter the expiry date.")

  const { error } = await supabase
    .from("pharmacy_batches")
    .update({
      batch_no: batchNo,
      qty_remaining: qtyRemaining,
      cost_price: costPrice,
      sale_price: salePrice,
      expiry_date: expiryDate,
    })
    .eq("id", batchId)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/pharmacy")
  return { ok: true, message: "Stock updated." }
}

// ---------------------------------------------------------------------------
// Expenses, salaries and staff (admin only)
// ---------------------------------------------------------------------------

/**
 * What the manual expense form may record.
 *
 * Salaries are missing on purpose: they go through paySalary so each one links
 * to a staff member and a month. Pharmacy purchases and lab payouts are
 * missing for the same reason - their own flows write them, and offering them
 * here as well is how the same Rs 74,550 stock purchase ends up in the ledger
 * twice, overstating outflow and understating profit.
 */
const MANUAL_EXPENSE_CATEGORIES = ["rent", "electricity", "other"] as const
export type ManualExpenseCategory = (typeof MANUAL_EXPENSE_CATEGORIES)[number]

function revalidateMoney() {
  revalidatePath("/expenses")
  revalidatePath("/")
}

export async function recordExpense(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can record an expense.")
  }

  const supabase = await createClient()
  const category = text(form, "expense_cat")
  const amount = Number(text(form, "amount"))
  const occurredOn = text(form, "occurred_on") || todayISO()
  const description = text(form, "description")

  if (!MANUAL_EXPENSE_CATEGORIES.includes(category as ManualExpenseCategory)) {
    return fail("Choose what the money was spent on.")
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Enter how much was spent. It must be more than zero.")
  }
  if (occurredOn > todayISO()) return fail("The date cannot be in the future.")
  if (!description) {
    return fail("Say what this was for — a bare amount is impossible to check later.")
  }

  const { error } = await supabase.from("ledger_entries").insert({
    direction: "out",
    expense_cat: category,
    amount,
    method: text(form, "method") || "cash",
    occurred_on: occurredOn,
    description,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidateMoney()
  return { ok: true, message: "Expense recorded." }
}

/**
 * Corrections are reversals, never edits: the ledger has no update or delete
 * granted to anyone, so the original always stays readable.
 */
export async function reverseExpense(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can reverse an expense.")
  }

  const supabase = await createClient()
  const entryId = text(form, "entry_id")
  const reason = text(form, "reason")

  if (!entryId) return fail("Missing the expense.")
  if (!reason) return fail("Say why this is being reversed — it goes on the record.")

  const { data: original, error: readError } = await supabase
    .from("ledger_entries")
    .select("id, amount, direction")
    .eq("id", entryId)
    .single()

  if (readError || !original) return fail("That expense could not be found.")
  if (original.direction !== "out") return fail("That entry is not an expense.")

  // The opposite direction is 'in', and the ledger insists an inbound row
  // carries an income category. It is not really income, which is why
  // money_summary leaves a reversal and the row it reverses out of both
  // totals rather than letting them show up as earnings.
  const { error } = await supabase.from("ledger_entries").insert({
    direction: "in",
    income_cat: "other",
    amount: original.amount,
    occurred_on: todayISO(),
    description: `Reversal: ${reason}`,
    reverses_id: original.id,
    reversal_reason: reason,
    created_by: profile.id,
  })

  if (error) return fail(describeDbError(error.message))

  revalidateMoney()
  return { ok: true, message: "Expense reversed. The original stays on record." }
}

export async function paySalary(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can pay salaries.")
  }

  const supabase = await createClient()
  const staffId = text(form, "staff_id")
  const forMonth = text(form, "for_month")
  const amount = Number(text(form, "amount"))
  const paidOn = text(form, "paid_on") || todayISO()

  if (!staffId) return fail("Missing the staff member.")
  if (!forMonth) return fail("Choose the month this salary is for.")
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Enter how much was paid. It must be more than zero.")
  }
  if (paidOn > todayISO()) return fail("The payment date cannot be in the future.")

  // One call, so the ledger entry and the salary record land together or not
  // at all. Two separate inserts could leave an expense in an append-only
  // ledger with no salary record to explain it.
  const { error } = await supabase.rpc("pay_salary", {
    p_staff_id: staffId,
    p_for_month: forMonth,
    p_amount: amount,
    p_paid_on: paidOn,
    p_method: text(form, "method") || "cash",
    p_description: text(form, "description") || null,
  })

  if (error) {
    if (error.message.includes("SALARY_ALREADY_PAID")) {
      return fail("This person has already been paid for that month.")
    }
    return fail(describeDbError(error.message))
  }

  revalidateMoney()
  return { ok: true, message: "Salary paid and recorded." }
}

export async function saveStaff(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can change staff records.")
  }

  const supabase = await createClient()
  const staffId = text(form, "staff_id")
  const fullName = text(form, "full_name")
  const designation = text(form, "designation")
  const monthlySalary = Number(text(form, "monthly_salary"))
  const joinedOn = text(form, "joined_on") || todayISO()
  const isActive = form.get("is_active") !== null

  if (!fullName) return fail("Enter the staff member's name.")
  if (!designation) return fail("Enter what they do, for example Staff Nurse.")
  if (!Number.isFinite(monthlySalary) || monthlySalary < 0) {
    return fail("Enter the monthly salary. It cannot be negative.")
  }
  if (joinedOn > todayISO()) return fail("The joining date cannot be in the future.")

  const row = {
    full_name: fullName,
    designation,
    monthly_salary: monthlySalary,
    phone: text(form, "phone") || null,
    joined_on: joinedOn,
    is_active: isActive,
    // Someone who has left keeps a leaving date; someone reinstated loses it.
    left_on: isActive ? null : text(form, "left_on") || todayISO(),
  }

  const { error } = staffId
    ? await supabase.from("staff").update(row).eq("id", staffId)
    : await supabase.from("staff").insert(row)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/expenses")
  return {
    ok: true,
    message: staffId ? "Staff record updated." : `${fullName} added to the staff list.`,
  }
}

// ---------------------------------------------------------------------------
// Settings — personal info (anyone) and permissions (admin only)
// ---------------------------------------------------------------------------

export async function updateOwnName(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  await requireProfile()
  const supabase = await createClient()

  const fullName = text(form, "full_name")
  if (!fullName) return fail("Enter your name.")

  // An RPC that only ever writes full_name, rather than a direct update: a
  // profiles policy that let someone update their own row would need
  // column-level RLS to stop the same request also touching role or
  // is_active.
  const { error } = await supabase.rpc("update_own_full_name", { p_full_name: fullName })
  if (error) return fail(describeDbError(error.message))

  revalidatePath("/", "layout")
  return { ok: true, message: "Name updated." }
}

/**
 * Supabase does not check the current password before accepting a new one,
 * so this signs in with it first - a wrong entry fails there, before
 * anything changes, the same as changing a password anywhere else.
 */
export async function changePassword(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  const supabase = await createClient()

  const oldPassword = text(form, "old_password")
  const newPassword = text(form, "new_password")
  const confirmPassword = text(form, "confirm_password")

  if (!oldPassword) return fail("Enter your current password.")
  if (newPassword.length < 8) {
    return fail("The new password must be at least 8 characters.")
  }
  if (newPassword !== confirmPassword) return fail("The new passwords do not match.")
  if (newPassword === oldPassword) {
    return fail("Choose a password different from your current one.")
  }

  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: oldPassword,
  })
  if (verifyError) return fail("Your current password is incorrect.")

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return fail(describeDbError(error.message))

  return { ok: true, message: "Password changed." }
}

/**
 * One object at a fixed path, upserted in place - the sidebar always reads
 * the same public URL rather than tracking whichever file was uploaded most
 * recently.
 */
export async function uploadLogo(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") {
    return fail("Only an administrator can change the clinic logo.")
  }

  const file = form.get("logo")
  if (!(file instanceof File) || file.size === 0) return fail("Choose an image to upload.")
  if (!file.type.startsWith("image/")) return fail("Choose an image file (PNG or JPEG).")
  if (file.size > 2 * 1024 * 1024) return fail("Keep the image under 2 MB.")

  const supabase = await createClient()
  const path = `logo.${file.type === "image/png" ? "png" : "jpg"}`

  const { error: uploadError } = await supabase.storage
    .from("branding")
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) return fail(describeDbError(uploadError.message))

  const { data } = supabase.storage.from("branding").getPublicUrl(path)
  // Same path every time, so the query string is what busts each browser's
  // cached copy of the old logo.
  const url = `${data.publicUrl}?v=${Date.now()}`

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "branding", value: { logo_url: url } }, { onConflict: "key" })
  if (error) return fail(describeDbError(error.message))

  revalidatePath("/", "layout")
  return { ok: true, message: "Logo updated." }
}

/**
 * Approve a pending signup, promote or demote a role, or deactivate /
 * reactivate a login. Never the caller's own row - the button for that is
 * not offered - and the last active admin cannot be removed this way
 * regardless, guarded at the row level by prevent_last_admin_removal.
 */
export async function setLogin(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can manage logins.")

  const supabase = await createClient()
  const userId = text(form, "user_id")
  const role = text(form, "role")
  const isActive = text(form, "is_active")

  if (!userId) return fail("Missing the login.")
  if (userId === profile.id) return fail("You cannot change your own access here.")
  if (!["admin", "staff"].includes(role)) return fail("Choose a role.")
  if (!["true", "false"].includes(isActive)) return fail("Missing the status.")

  const { error } = await supabase
    .from("profiles")
    .update({ role, is_active: isActive === "true" })
    .eq("id", userId)

  if (error) return fail(describeDbError(error.message))

  revalidatePath("/settings")
  return { ok: true, message: "Login updated." }
}

/**
 * Every login is created by an administrator, never by the person signing
 * up - there is no public signup page. An admin login keeps a real email; a
 * staff login gets a username, which is a synthetic, unmailable email under
 * the hood so the rest of Supabase Auth needs no changes to support it.
 *
 * Requires the service role key: creating an account with a password the
 * admin chose, active immediately, with no confirmation email to click, is
 * exactly what an ordinary signed-in session cannot do to another account.
 */
export async function createLogin(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can create a login.")

  const loginType = text(form, "login_type")
  const fullName = text(form, "full_name")
  const identifier = text(form, "identifier")
  const password = text(form, "password")

  if (!["admin", "staff"].includes(loginType)) return fail("Choose admin or staff.")
  if (!fullName) return fail("Enter their name.")
  if (password.length < 8) return fail("The password must be at least 8 characters.")

  let email: string
  if (loginType === "staff") {
    if (!USERNAME_PATTERN.test(identifier)) {
      return fail(
        "Usernames are 3-32 characters: letters, numbers, dots, dashes and underscores only."
      )
    }
    email = staffEmailFor(identifier)
  } else {
    if (!identifier.includes("@") || !identifier.includes(".")) {
      return fail("Enter a valid email address.")
    }
    email = identifier
  }

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not create the login.")
  }

  const { data, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  })

  if (createError) {
    const m = createError.message.toLowerCase()
    if (m.includes("already registered") || m.includes("already exists")) {
      return fail(
        loginType === "staff"
          ? "That username is already taken."
          : "That email is already in use."
      )
    }
    return fail(createError.message)
  }

  // handle_new_user has already inserted a profile row (staff, inactive, as
  // it does for every new auth.users row) - this is the one place that
  // outcome is overridden, to what was actually asked for on this form.
  const supabase = await createClient()
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: loginType, is_active: true, full_name: fullName })
    .eq("id", data.user.id)

  if (updateError) {
    return fail(`Login created, but could not be finished: ${describeDbError(updateError.message)}`)
  }

  revalidatePath("/settings")
  return {
    ok: true,
    message:
      loginType === "staff"
        ? `Login ready. Give them the username "${identifier}" and the password.`
        : "Login ready.",
  }
}

/**
 * The admin sets a new password directly - there is no "forgot password"
 * flow here, because a staff login has no real email to send a reset link
 * to, and an admin resetting their own password already goes through the
 * ordinary change-password form on Personal info instead of this one.
 */
export async function resetLoginPassword(
  _prev: ActionResult | null,
  form: FormData
): Promise<ActionResult> {
  const profile = await requireProfile()
  if (profile.role !== "admin") return fail("Only an administrator can reset a password.")

  const userId = text(form, "user_id")
  const password = text(form, "password")

  if (!userId) return fail("Missing the login.")
  if (userId === profile.id) return fail("Change your own password from Personal info.")
  if (password.length < 8) return fail("The new password must be at least 8 characters.")

  let admin: ReturnType<typeof createAdminClient>
  try {
    admin = createAdminClient()
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Could not reset the password.")
  }

  const { error } = await admin.auth.admin.updateUserById(userId, { password })
  if (error) return fail(error.message)

  return { ok: true, message: "Password reset." }
}
