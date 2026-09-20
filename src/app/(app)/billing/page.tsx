import Link from "next/link"
import { Receipt } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { BalanceSummary } from "@/components/billing/balance-summary"
import {
  BillingSearch,
  OwingFilter,
  StatusFilter,
} from "@/components/billing/billing-filters"
import {
  DiscountButton,
  RecordPaymentButton,
  ReversePaymentButton,
} from "@/components/billing/payment-dialogs"
import { Badge } from "@/components/ui/badge"
import {
  hasNoBill,
  isBillingFilter,
  isBillingStatus,
  toBalances,
  type AdmissionBalance,
  type BillingFilter,
  type BillingStatus,
} from "@/lib/billing"
import { formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"
import { cn } from "@/lib/utils"

export const metadata = { title: "Billing" }

interface Payment {
  id: string
  amount: number | string
  method: string
  occurred_on: string
  description: string | null
  is_reversed: boolean
}

interface PatientRef {
  id: string
  mrn: string
  full_name: string
}

interface Stay {
  id: string
  admitted_on: string
  discharged_on: string | null
  status: string
  patients: PatientRef
  wards: { name: string } | null
}

/** A bill for a stay, or a patient who has no stay to bill against. */
type Row =
  | { kind: "stay"; stay: Stay; balance: AdmissionBalance }
  | { kind: "patient"; patient: PatientRef }

function matches(patient: PatientRef, query: string): boolean {
  if (!query) return true
  const needle = query.toLowerCase()
  return (
    patient.full_name.toLowerCase().includes(needle) ||
    patient.mrn.toLowerCase().includes(needle)
  )
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; status?: string; q?: string }>
}) {
  const { show, status: rawStatus, q = "" } = await searchParams
  const filter: BillingFilter = isBillingFilter(show) ? show : "owing"
  const status: BillingStatus = isBillingStatus(rawStatus)
    ? rawStatus
    : "registered"
  const query = q.trim()

  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  const [admissionsResult, patientsResult, balancesResult] = await Promise.all([
    supabase
      .from("admissions")
      .select(
        "id, admitted_on, discharged_on, status, patients(id, mrn, full_name), wards(name)"
      )
      .order("admitted_on", { ascending: false }),
    // Needed for the Registered view: a patient who has never been admitted
    // has no admission row, so they cannot be reached through the join above.
    supabase
      .from("patients")
      .select("id, mrn, full_name")
      .order("created_at", { ascending: false }),
    supabase.rpc("admission_balances"),
  ])

  const balances = toBalances(balancesResult.data)
  const allStays = (admissionsResult.data ?? []) as unknown as Stay[]
  const allPatients = (patientsResult.data ?? []) as PatientRef[]

  const everAdmitted = new Set(allStays.map((stay) => stay.patients.id))

  const stayRows: Row[] = allStays
    .filter((stay) => balances.has(stay.id))
    .filter((stay) =>
      status === "admitted"
        ? stay.discharged_on === null
        : status === "discharged"
          ? stay.discharged_on !== null
          : true
    )
    .filter((stay) => matches(stay.patients, query))
    .map((stay) => ({ kind: "stay", stay, balance: balances.get(stay.id)! }))

  // Only under Registered: nobody looking for who is in a bed, or who has gone
  // home, wants a patient who was never admitted in the list.
  const patientRows: Row[] =
    status === "registered"
      ? allPatients
          .filter((patient) => !everAdmitted.has(patient.id))
          .filter((patient) => matches(patient, query))
          .map((patient) => ({ kind: "patient", patient }))
      : []

  // A patient with nothing billed owes nothing, so "Still owing" leaves them
  // out - which is right: they are not a debt, they are a gap in the records.
  const rows: Row[] = [...stayRows, ...patientRows].filter((row) =>
    filter === "owing"
      ? row.kind === "stay" && row.balance.balance > 0
      : true
  )

  // Payment history, fetched only for the rows actually shown. Scoped per
  // admission by the RPC, so this never walks the whole ledger.
  const paymentsByStay = new Map<string, Payment[]>()
  await Promise.all(
    rows
      .filter((row): row is Extract<Row, { kind: "stay" }> => row.kind === "stay")
      .map(async ({ stay }) => {
        const { data } = await supabase.rpc("admission_payments", {
          p_admission_id: stay.id,
        })
        paymentsByStay.set(stay.id, (data ?? []) as Payment[])
      })
  )

  const owedRows = rows.filter(
    (row) => row.kind === "stay" && row.balance.balance > 0
  )
  const totalOwed = owedRows.reduce(
    (sum, row) => sum + (row.kind === "stay" ? row.balance.balance : 0),
    0
  )
  const unbilled = rows.filter(
    (row) => row.kind === "patient" || hasNoBill(row.balance)
  ).length

  return (
    <>
      <PageHeader
        title="Billing"
        description="What each family has been charged, paid, and still owes."
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <StatusFilter show={filter} status={status} query={query} />
          <OwingFilter show={filter} status={status} query={query} />
          <BillingSearch query={query} show={filter} status={status} />
        </div>

        {rows.length > 0 ? (
          <p className="text-base text-muted-foreground">
            {owedRows.length > 0 ? (
              <>
                {owedRows.length}{" "}
                {owedRows.length === 1 ? "family owes" : "families owe"} a total
                of{" "}
                <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                  {formatPKR(totalOwed)}
                </span>
                .
              </>
            ) : (
              <>Nothing is owed in this view.</>
            )}
            {unbilled > 0 ? (
              <>
                {" "}
                {unbilled} {unbilled === 1 ? "has" : "have"} no bill entered yet.
              </>
            ) : null}
          </p>
        ) : null}

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Receipt className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">
              {query
                ? "No patient matches that search."
                : filter === "owing"
                  ? "Nothing is owed."
                  : "No bills yet."}
            </p>
            <p className="text-base text-muted-foreground">
              {query
                ? "Check the spelling, or try another status."
                : filter === "owing"
                  ? "Every bill in this view has been settled."
                  : "A bill appears here as soon as a patient is admitted."}
            </p>
          </div>
        ) : (
          rows.map((row) =>
            row.kind === "patient" ? (
              <UnbilledPatientCard key={row.patient.id} patient={row.patient} />
            ) : (
              <BillCard
                key={row.stay.id}
                stay={row.stay}
                balance={row.balance}
                payments={paymentsByStay.get(row.stay.id) ?? []}
                isAdmin={isAdmin}
              />
            )
          )
        )}
      </div>
    </>
  )
}

/** Said in words, not by an empty space where the figures should be. */
function NoBillNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg bg-muted px-3 py-2.5 text-base text-muted-foreground">
      <span className="font-medium text-foreground">No bill entered yet.</span>{" "}
      {children}
    </p>
  )
}

function UnbilledPatientCard({ patient }: { patient: PatientRef }) {
  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <Link
            href={`/patients/${patient.id}`}
            className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
          >
            {patient.full_name}
          </Link>
          <Badge variant="neutral" className="text-sm">
            Registered
          </Badge>
        </div>
        <p className="text-base text-muted-foreground">
          <span className="tabular-nums">{patient.mrn}</span> · never admitted
        </p>
      </div>

      <NoBillNotice>
        This patient has been registered but never admitted, so there is nothing
        to charge against. Admit them from the Patients page if they are staying.
      </NoBillNotice>
    </article>
  )
}

function BillCard({
  stay,
  balance,
  payments,
  isAdmin,
}: {
  stay: Stay
  balance: AdmissionBalance
  payments: Payment[]
  isAdmin: boolean
}) {
  const patient = stay.patients
  const empty = hasNoBill(balance)

  return (
    <article className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <Link
              href={`/patients/${patient.id}`}
              className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
            >
              {patient.full_name}
            </Link>
            <Badge
              variant={stay.discharged_on ? "neutral" : "success"}
              className="text-sm"
            >
              {stay.discharged_on ? "Discharged" : "Admitted"}
            </Badge>
          </div>
          <p className="text-base text-muted-foreground">
            <span className="tabular-nums">{patient.mrn}</span> ·{" "}
            {stay.wards?.name ?? "Ward"} ·{" "}
            <span className="tabular-nums">{stay.admitted_on}</span>
            {stay.discharged_on ? (
              <>
                {" → "}
                <span className="tabular-nums">{stay.discharged_on}</span>
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* An admission nobody has entered charges against looks identical to a
          settled bill if all you show is a row of zeroes. */}
      {empty ? (
        <NoBillNotice>
          This stay has no charges against it. Add them from the patient&apos;s
          page, or record a payment below if money has already been taken.
        </NoBillNotice>
      ) : (
        <BalanceSummary balance={balance} />
      )}

      {payments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-base font-medium">Payments</h3>
          <ul className="flex flex-col gap-1.5">
            {payments.map((payment) => (
              <li
                key={payment.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/60 px-3 py-2.5"
              >
                <span
                  className={cn(
                    "text-base font-semibold whitespace-nowrap tabular-nums",
                    payment.is_reversed && "text-muted-foreground line-through"
                  )}
                >
                  {formatPKR(Number(payment.amount))}
                </span>
                <span className="text-base text-muted-foreground capitalize">
                  {payment.method}
                </span>
                <span className="text-base text-muted-foreground tabular-nums">
                  {payment.occurred_on}
                </span>
                {payment.description ? (
                  <span className="text-base text-muted-foreground">
                    {payment.description}
                  </span>
                ) : null}
                {payment.is_reversed ? (
                  <Badge variant="destructive" className="text-sm">
                    Reversed
                  </Badge>
                ) : null}
                <span className="ml-auto">
                  {isAdmin && !payment.is_reversed ? (
                    <ReversePaymentButton
                      paymentId={payment.id}
                      amount={Number(payment.amount)}
                    />
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <RecordPaymentButton
          admissionId={stay.id}
          patientId={patient.id}
          patientName={patient.full_name}
          balance={balance.balance}
        />
        {isAdmin && balance.balance > 0 ? (
          <DiscountButton
            admissionId={stay.id}
            patientName={patient.full_name}
            balance={balance.balance}
          />
        ) : null}
      </div>
    </article>
  )
}
