import Link from "next/link"
import { Receipt } from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { BalanceSummary } from "@/components/billing/balance-summary"
import {
  DiscountButton,
  RecordPaymentButton,
  ReversePaymentButton,
} from "@/components/billing/payment-dialogs"
import { Badge } from "@/components/ui/badge"
import {
  BILLING_FILTER_LABELS,
  isBillingFilter,
  toBalances,
  type BillingFilter,
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

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string }>
}) {
  const { show } = await searchParams
  const filter: BillingFilter = isBillingFilter(show) ? show : "owing"

  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  const [admissionsResult, balancesResult] = await Promise.all([
    supabase
      .from("admissions")
      .select(
        "id, admitted_on, discharged_on, status, patients(id, mrn, full_name), wards(name)"
      )
      .order("admitted_on", { ascending: false }),
    supabase.rpc("admission_balances"),
  ])

  const balances = toBalances(balancesResult.data)

  const stays = (admissionsResult.data ?? [])
    .map((stay) => ({
      stay: stay as unknown as {
        id: string
        admitted_on: string
        discharged_on: string | null
        status: string
        patients: { id: string; mrn: string; full_name: string }
        wards: { name: string } | null
      },
      balance: balances.get(stay.id),
    }))
    .filter((row) => row.balance !== undefined)
    .filter((row) => (filter === "owing" ? row.balance!.balance > 0 : true))

  // Payment history for the stays shown. Scoped per admission by the RPC, so
  // this never walks the whole ledger.
  const paymentsByStay = new Map<string, Payment[]>()
  await Promise.all(
    stays.map(async ({ stay }) => {
      const { data } = await supabase.rpc("admission_payments", {
        p_admission_id: stay.id,
      })
      paymentsByStay.set(stay.id, (data ?? []) as Payment[])
    })
  )

  const totalOwed = stays.reduce(
    (sum, row) => sum + Math.max(0, row.balance!.balance),
    0
  )

  return (
    <>
      <PageHeader
        title="Billing"
        description="What each family has been charged, paid, and still owes."
        actions={
          <div
            role="group"
            aria-label="Filter bills"
            className="inline-flex rounded-lg border border-border bg-card p-0.5"
          >
            {(Object.keys(BILLING_FILTER_LABELS) as BillingFilter[]).map((key) => {
              const base = "rounded-md px-3.5 py-2 text-base font-medium transition-colors"
              if (key === filter) {
                return (
                  <span
                    key={key}
                    aria-current="true"
                    className={cn(base, "bg-primary text-primary-foreground")}
                  >
                    {BILLING_FILTER_LABELS[key]}
                  </span>
                )
              }
              return (
                <Link
                  key={key}
                  href={`/billing?show=${key}`}
                  scroll={false}
                  className={cn(base, "text-muted-foreground hover:text-foreground")}
                >
                  {BILLING_FILTER_LABELS[key]}
                </Link>
              )
            })}
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {filter === "owing" && stays.length > 0 ? (
          <p className="text-base text-muted-foreground">
            {stays.length} {stays.length === 1 ? "family owes" : "families owe"} a total
            of{" "}
            <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
              {formatPKR(totalOwed)}
            </span>
            .
          </p>
        ) : null}

        {stays.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <Receipt className="size-8 text-muted-foreground" aria-hidden />
            <p className="text-base font-medium">
              {filter === "owing" ? "Nothing is owed." : "No bills yet."}
            </p>
            <p className="text-base text-muted-foreground">
              {filter === "owing"
                ? "Every bill has been settled."
                : "A bill appears here as soon as a child is admitted."}
            </p>
          </div>
        ) : (
          stays.map(({ stay, balance }) => {
            const payments = paymentsByStay.get(stay.id) ?? []
            const patient = stay.patients

            return (
              <article
                key={stay.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                      <Link
                        href={`/patients/${patient.id}`}
                        className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
                      >
                        {patient.full_name}
                      </Link>
                      <Badge variant={stay.discharged_on ? "neutral" : "success"} className="text-sm">
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

                <BalanceSummary balance={balance!} />

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
                              payment.is_reversed &&
                                "text-muted-foreground line-through"
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
                    balance={balance!.balance}
                  />
                  {isAdmin && balance!.balance > 0 ? (
                    <DiscountButton
                      admissionId={stay.id}
                      patientName={patient.full_name}
                      balance={balance!.balance}
                    />
                  ) : null}
                </div>
              </article>
            )
          })
        )}
      </div>
    </>
  )
}
