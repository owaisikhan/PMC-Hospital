import {
  BedDouble,
  FlaskConical,
  Receipt,
  UserPlus,
  Wallet,
  Pill,
} from "lucide-react"

import { PageHeader } from "@/components/layout/page-header"
import { QuickActions, type QuickAction } from "@/components/quick-actions"
import { StatCard } from "@/components/stat-card"
import { daysFromNowISO, todayISO } from "@/lib/dates"
import { formatPKR, pluralize } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export const metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const profile = await requireProfile()
  const supabase = await createClient()
  const today = todayISO()

  const [patients, admitted, expiring, todayIncome] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }),
    supabase
      .from("admissions")
      .select("id", { count: "exact", head: true })
      .is("discharged_on", null),
    supabase
      .from("pharmacy_batches")
      .select("id", { count: "exact", head: true })
      .gt("qty_remaining", 0)
      .lte("expiry_date", daysFromNowISO(90)),
    // Staff cannot read the ledger at all, so this returns nothing for them —
    // enforced by row level security, not by skipping the query.
    profile.role === "admin"
      ? supabase
          .from("ledger_entries")
          .select("amount")
          .eq("direction", "in")
          .eq("occurred_on", today)
      : Promise.resolve({ data: null }),
  ])

  const patientCount = patients.count ?? 0
  const admittedCount = admitted.count ?? 0
  const expiringCount = expiring.count ?? 0
  const incomeToday = (todayIncome.data ?? []).reduce(
    (sum, row: { amount: number | string }) => sum + Number(row.amount),
    0
  )

  const actions: QuickAction[] = [
    {
      label: "Add Patient",
      href: "/patients",
      icon: UserPlus,
      caption: pluralize(patientCount, "patient"),
    },
    {
      label: "New Admission",
      href: "/admissions",
      icon: BedDouble,
      caption: `${admittedCount} admitted`,
    },
    { label: "Pharmacy Sale", href: "/pharmacy", icon: Pill },
    { label: "Lab Order", href: "/laboratory", icon: FlaskConical },
    { label: "New Invoice", href: "/billing", icon: Receipt },
    ...(profile.role === "admin"
      ? [{ label: "Record Expense", href: "/expenses", icon: Wallet }]
      : []),
  ]

  return (
    <>
      <PageHeader
        title={`Welcome, ${profile.fullName.split(" ")[0]}`}
        description="PMC — Paeds Medical Complex"
      />

      <div className="flex flex-col gap-5 px-4 py-6 sm:px-6">
        <QuickActions actions={actions} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Currently admitted" value={String(admittedCount)} icon={BedDouble} />
          <StatCard label="Registered patients" value={String(patientCount)} icon={UserPlus} />
          <StatCard
            label="Batches expiring in 90 days"
            value={String(expiringCount)}
            icon={Pill}
            trend={expiringCount > 0 ? "Check pharmacy stock" : "Nothing expiring soon"}
            trendDirection={expiringCount > 0 ? "down" : "flat"}
          />
          {profile.role === "admin" ? (
            <StatCard
              label="Income today"
              value={formatPKR(incomeToday)}
              icon={Receipt}
              trend="Cash received today"
            />
          ) : null}
        </div>
      </div>
    </>
  )
}
