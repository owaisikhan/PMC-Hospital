/** One row from the `admission_balances` RPC, as numbers. */
export interface AdmissionBalance {
  admissionId: string
  patientId: string
  totalCharges: number
  totalDiscount: number
  totalPaid: number
  balance: number
  isDischarged: boolean
}

interface RawBalance {
  admission_id: string
  patient_id: string
  total_charges: number | string
  total_discount: number | string
  total_paid: number | string
  balance: number | string
  is_discharged: boolean
}

/**
 * Postgres numerics arrive as strings over PostgREST. Converting once, here,
 * keeps `Number(...)` out of every component that renders money.
 */
export function toBalances(rows: unknown): Map<string, AdmissionBalance> {
  const map = new Map<string, AdmissionBalance>()
  for (const row of (rows ?? []) as RawBalance[]) {
    map.set(row.admission_id, {
      admissionId: row.admission_id,
      patientId: row.patient_id,
      totalCharges: Number(row.total_charges),
      totalDiscount: Number(row.total_discount),
      totalPaid: Number(row.total_paid),
      balance: Number(row.balance),
      isDischarged: row.is_discharged,
    })
  }
  return map
}

export const EMPTY_BALANCE: Omit<AdmissionBalance, "admissionId" | "patientId"> = {
  totalCharges: 0,
  totalDiscount: 0,
  totalPaid: 0,
  balance: 0,
  isDischarged: false,
}

export type BillingFilter = "owing" | "all"

export const BILLING_FILTER_LABELS: Record<BillingFilter, string> = {
  owing: "Still owing",
  all: "All bills",
}

export function isBillingFilter(value: string | undefined): value is BillingFilter {
  return value === "owing" || value === "all"
}
