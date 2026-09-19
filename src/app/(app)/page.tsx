import {
  BedDouble,
  CircleAlert,
  FlaskConical,
  Pill,
  Receipt,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"

import { FlipRevenueCard } from "@/components/flip-revenue-card"
import { PageHeader } from "@/components/layout/page-header"
import { PeriodFilter } from "@/components/period-filter"
import { QuickActions, type QuickAction } from "@/components/quick-actions"
import { RevenueCard } from "@/components/revenue-card"
import { StatCard } from "@/components/stat-card"
import { daysFromNowISO, isPeriod, periodRange, type Period } from "@/lib/dates"
import { pluralize } from "@/lib/format"
import { foldMoneySummary, type MoneySummaryRow } from "@/lib/money"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period: rawPeriod } = await searchParams
  const period: Period = isPeriod(rawPeriod) ? rawPeriod : "day"
  const range = periodRange(period)

  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"
  const supabase = await createClient()

  const [patients, admitted, expiring, money] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    // Rows rather than a head count: the ward ids give both how many children
    // are in and how many wards are in use, from one query.
    supabase.from("admissions").select("ward_id").is("discharged_on", null),
    supabase
      .from("pharmacy_batches")
      .select("id", { count: "exact", head: true })
      .gt("qty_remaining", 0)
      .lte("expiry_date", daysFromNowISO(90)),
    // Invoker rights: staff get an empty result because RLS hides the ledger
    // from them. The role check below decides what to render, not what to ask.
    supabase.rpc("money_summary", { from_date: range.from, to_date: range.to }),
  ])

  // Outstanding is not period-scoped on purpose: money owed is owed whatever
  // month it was incurred in, and scoping it would hide the oldest debts.
  const { data: outstanding } = isAdmin
    ? await supabase.rpc("outstanding_total")
    : { data: null }

  const patientCount = patients.count ?? 0
  const openStays = (admitted.data ?? []) as { ward_id: string }[]
  const admittedCount = openStays.length
  const wardsInUse = new Set(openStays.map((stay) => stay.ward_id)).size
  const expiringCount = expiring.count ?? 0
  const totals = foldMoneySummary(money.data as MoneySummaryRow[] | null)

  const share = (amount: number) =>
    totals.totalIncome > 0 ? (amount / totals.totalIncome) * 100 : undefined

  const actions: QuickAction[] = [
    {
      label: "Admit Patient",
      href: "/patients",
      icon: BedDouble,
      caption: `${admittedCount} admitted · ${pluralize(patientCount, "patient")}`,
    },
    { label: "Pharmacy Sale", href: "/pharmacy", icon: Pill },
    { label: "Lab Order", href: "/laboratory", icon: FlaskConical },
    { label: "New Invoice", href: "/billing", icon: Receipt },
    ...(isAdmin
      ? [{ label: "Record Expense", href: "/expenses", icon: Wallet }]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.fullName.split(" ")[0]}`}
        description="PMC — Paeds Medical Complex"
        actions={isAdmin ? <PeriodFilter active={period} /> : undefined}
      />

      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        {/* Who is in the building, before any money. Staff see this too. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label="Currently admitted"
            value={String(admittedCount)}
            icon={BedDouble}
            trend={`across ${wardsInUse} ${wardsInUse === 1 ? "ward" : "wards"}`}
          />
          <StatCard
            label="Batches expiring in 90 days"
            value={String(expiringCount)}
            icon={Pill}
            trend={expiringCount > 0 ? "Check pharmacy stock" : "Nothing expiring soon"}
            trendDirection={expiringCount > 0 ? "down" : "flat"}
          />
        </div>

        {isAdmin ? (
          <section className="flex flex-col gap-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-base font-semibold tracking-tight">
                Revenue — {range.label.toLowerCase()}
              </h2>
              <p className="text-sm text-muted-foreground tabular-nums">
                {range.from === range.to
                  ? range.from
                  : `${range.from} to ${range.to}`}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <FlipRevenueCard
                label="Admissions"
                amount={totals.income.admission}
                patientCount={patientCount}
                sharePercent={share(totals.income.admission)}
              />
              <RevenueCard
                label="Pharmacy"
                amount={totals.income.pharmacy}
                icon={Pill}
                sharePercent={share(totals.income.pharmacy)}
              />
              <RevenueCard
                label="Laboratory"
                amount={totals.income.lab}
                icon={FlaskConical}
                sharePercent={share(totals.income.lab)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <RevenueCard
                label="Total income"
                amount={totals.totalIncome}
                icon={TrendingUp}
                emphasis="positive"
              />
              <RevenueCard
                label="Total expenses"
                amount={totals.totalExpenses}
                icon={TrendingDown}
                emphasis="negative"
              />
              <RevenueCard
                label={totals.net < 0 ? "Net loss" : "Net profit"}
                amount={Math.abs(totals.net)}
                icon={Wallet}
                emphasis={totals.net < 0 ? "negative" : "positive"}
              />
              <RevenueCard
                label="Outstanding (all time)"
                amount={Number(outstanding ?? 0)}
                icon={CircleAlert}
                emphasis={Number(outstanding ?? 0) > 0 ? "negative" : "default"}
              />
            </div>
          </section>
        ) : null}

        <QuickActions actions={actions} />
      </div>
    </>
  )
}
