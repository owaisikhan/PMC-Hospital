import { UserPlus, Users, Wallet } from "lucide-react"

import {
  RecordExpenseButton,
  ReverseExpenseButton,
} from "@/components/expenses/expense-dialogs"
import { MonthPicker } from "@/components/expenses/month-picker"
import { PaySalaryButton } from "@/components/expenses/salary-dialogs"
import {
  AddStaffButton,
  EditStaffButton,
  type StaffRecord,
} from "@/components/expenses/staff-dialogs"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs"
import { TabPanel } from "@/components/ui/tab-panel"
import { monthLabel, nextMonthStartISO, recentMonths } from "@/lib/dates"
import { formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/session"

export const metadata = { title: "Expenses" }

const TABS = ["expenses", "salaries", "staff"] as const
type ExpensesTab = (typeof TABS)[number]

const TAB_LABELS: Record<ExpensesTab, string> = {
  expenses: "Expenses",
  salaries: "Salaries",
  staff: "Staff",
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: "Rent",
  salaries: "Salaries",
  electricity: "Electricity",
  pharmacy_purchase: "Pharmacy stock",
  lab_payout: "Lab settlements",
  other: "Other",
}

/** Categories the manual form cannot write, so the page can say where they came from. */
const AUTOMATIC_CATEGORIES = new Set(["salaries", "pharmacy_purchase", "lab_payout"])

interface ExpenseRow {
  id: string
  expense_cat: string
  amount: string
  occurred_on: string
  method: string
  description: string | null
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>
}) {
  const { tab: rawTab, month: rawMonth } = await searchParams

  // Hiding the sidebar link is tidiness, not access control: without this a
  // staff member who types the URL reaches the page.
  await requireAdmin()

  const tab: ExpensesTab = TABS.includes(rawTab as ExpensesTab)
    ? (rawTab as ExpensesTab)
    : "expenses"
  const months = recentMonths(12)
  const month = rawMonth && months.includes(rawMonth) ? rawMonth : months[0]
  const monthEnd = nextMonthStartISO(month)

  const supabase = await createClient()

  // Outbound entries for the month, plus every reversal so a cancelled expense
  // can be shown struck through rather than silently dropped.
  const [expensesResult, reversalsResult, staffResult, paymentsResult] =
    await Promise.all([
      supabase
        .from("ledger_entries")
        .select("id, expense_cat, amount, occurred_on, method, description")
        .eq("direction", "out")
        .is("reverses_id", null)
        .gte("occurred_on", month)
        .lt("occurred_on", monthEnd)
        .order("occurred_on", { ascending: false }),
      supabase
        .from("ledger_entries")
        .select("reverses_id")
        .not("reverses_id", "is", null),
      supabase
        .from("staff")
        .select("id, full_name, designation, monthly_salary, phone, joined_on, is_active")
        .order("is_active", { ascending: false })
        .order("monthly_salary", { ascending: false }),
      supabase
        .from("salary_payments")
        .select("staff_id, amount, paid_on")
        .eq("for_month", month),
    ])

  const expenses = (expensesResult.data ?? []) as ExpenseRow[]
  const reversed = new Set(
    (reversalsResult.data ?? []).map((r) => r.reverses_id as string)
  )
  const allStaff = (staffResult.data ?? []) as {
    id: string
    full_name: string
    designation: string
    monthly_salary: string
    phone: string | null
    joined_on: string
    is_active: boolean
  }[]
  const paidByStaff = new Map(
    (paymentsResult.data ?? []).map((p) => [
      p.staff_id as string,
      { amount: Number(p.amount), paidOn: p.paid_on as string },
    ])
  )

  // Reversed entries are excluded from every total, matching money_summary.
  const live = expenses.filter((row) => !reversed.has(row.id))
  const monthTotal = live.reduce((sum, row) => sum + Number(row.amount), 0)

  const byCategory = new Map<string, number>()
  for (const row of live) {
    byCategory.set(
      row.expense_cat,
      (byCategory.get(row.expense_cat) ?? 0) + Number(row.amount)
    )
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])

  const activeStaff = allStaff.filter((s) => s.is_active)
  const paidCount = activeStaff.filter((s) => paidByStaff.has(s.id)).length
  const wageBill = activeStaff.reduce((sum, s) => sum + Number(s.monthly_salary), 0)
  const paidTotal = activeStaff.reduce(
    (sum, s) => sum + (paidByStaff.get(s.id)?.amount ?? 0),
    0
  )

  const tabItems: TabItem[] = TABS.map((key) => ({
    key,
    label: TAB_LABELS[key],
    href: `/expenses?tab=${key}&month=${month}`,
  }))

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every rupee leaving PMC — running costs, salaries, and who is on the payroll."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SlidingTabs
              items={tabItems}
              active={tab}
              groupId="expenses-tab"
              ariaLabel="Expenses sections"
              size="large"
            />
            {tab === "staff" ? <AddStaffButton /> : null}
            {tab === "expenses" ? <RecordExpenseButton /> : null}
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        {tab !== "staff" ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MonthPicker months={months} active={month} tab={tab} />
            <p className="text-base text-muted-foreground">
              {tab === "expenses" ? (
                <>
                  {live.length} {live.length === 1 ? "entry" : "entries"} ·{" "}
                  <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                    {formatPKR(monthTotal)}
                  </span>{" "}
                  out in {monthLabel(month)}
                </>
              ) : (
                <>
                  {paidCount} of {activeStaff.length} paid ·{" "}
                  <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
                    {formatPKR(paidTotal)}
                  </span>{" "}
                  of {formatPKR(wageBill)}
                </>
              )}
            </p>
          </div>
        ) : null}

        <TabPanel panelKey={`${tab}-${month}`} index={TABS.indexOf(tab)}>
          <div className="flex flex-col gap-4">
            {tab === "expenses" ? (
              <ExpensesTab
                rows={expenses}
                reversed={reversed}
                categories={categories}
                monthTotal={monthTotal}
                month={month}
              />
            ) : tab === "salaries" ? (
              <SalariesTab
                staff={activeStaff}
                paidByStaff={paidByStaff}
                month={month}
              />
            ) : (
              <StaffTab staff={allStaff} />
            )}
          </div>
        </TabPanel>
      </div>
    </>
  )
}

function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: typeof Wallet
  title: string
  hint: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-14 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-base font-medium">{title}</p>
      <p className="text-base text-muted-foreground">{hint}</p>
    </div>
  )
}

function ExpensesTab({
  rows,
  reversed,
  categories,
  monthTotal,
  month,
}: {
  rows: ExpenseRow[]
  reversed: Set<string>
  categories: [string, number][]
  monthTotal: number
  month: string
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title={`Nothing was paid out in ${monthLabel(month)}.`}
        hint="Use “Record expense” above for rent, electricity or anything else."
      />
    )
  }

  return (
    <>
      {/* Where the month's money went, largest first. */}
      <div className="flex flex-wrap gap-2">
        {categories.map(([category, total]) => (
          <div
            key={category}
            className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3"
          >
            <span className="text-sm text-muted-foreground">
              {CATEGORY_LABELS[category] ?? category}
            </span>
            <span className="text-lg font-semibold whitespace-nowrap tabular-nums">
              {formatPKR(total)}
            </span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {monthTotal > 0 ? Math.round((total / monthTotal) * 100) : 0}% of the month
            </span>
          </div>
        ))}
      </div>

      {/* min-w-0 keeps the table scrolling inside its own card rather than
          dragging the page sideways; relative keeps the hidden Actions label
          clipped here instead of escaping to the document. */}
      <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[48rem] border-collapse text-base">
          <caption className="sr-only">
            Expenses recorded in {monthLabel(month)}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">Date</th>
              <th scope="col" className="px-4 py-3 font-medium">What it was</th>
              <th scope="col" className="px-4 py-3 font-medium">Category</th>
              <th scope="col" className="px-4 py-3 font-medium">Paid by</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isReversed = reversed.has(row.id)
              const automatic = AUTOMATIC_CATEGORIES.has(row.expense_cat)

              return (
                <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                    {row.occurred_on}
                  </td>
                  <td className="px-4 py-3">
                    <span className={isReversed ? "text-muted-foreground line-through" : ""}>
                      {row.description ?? "—"}
                    </span>
                    {/* The word says it as well as the strike-through, so the
                        state does not depend on noticing a line. */}
                    {isReversed ? (
                      <Badge variant="destructive" className="ml-2 text-sm">
                        Reversed
                      </Badge>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {CATEGORY_LABELS[row.expense_cat] ?? row.expense_cat}
                    {automatic ? (
                      <span className="block text-sm text-muted-foreground">
                        {row.expense_cat === "salaries"
                          ? "from the salary run"
                          : row.expense_cat === "pharmacy_purchase"
                            ? "from Pharmacy"
                            : "from Laboratory"}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize whitespace-nowrap text-muted-foreground">
                    {row.method}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums${
                      isReversed ? " text-muted-foreground line-through" : ""
                    }`}
                  >
                    {formatPKR(Number(row.amount))}
                  </td>
                  <td className="px-4 py-3">
                    {isReversed ? null : (
                      <ReverseExpenseButton
                        entryId={row.id}
                        amount={Number(row.amount)}
                        description={row.description ?? "this expense"}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        A reversed entry stays on the record and is left out of every total. The
        ledger is never edited.
      </p>
    </>
  )
}

function SalariesTab({
  staff,
  paidByStaff,
  month,
}: {
  staff: {
    id: string
    full_name: string
    designation: string
    monthly_salary: string
    phone: string | null
    joined_on: string
    is_active: boolean
  }[]
  paidByStaff: Map<string, { amount: number; paidOn: string }>
  month: string
}) {
  if (staff.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Nobody is on the payroll yet."
        hint="Add staff on the Staff tab, then their salaries can be paid here."
      />
    )
  }

  return (
    <>
      <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[46rem] border-collapse text-base">
          <caption className="sr-only">
            Salary run for {monthLabel(month)}
          </caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">Staff member</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Agreed salary</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Paid</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => {
              const payment = paidByStaff.get(person.id)
              const salary = Number(person.monthly_salary)
              const short = payment ? salary - payment.amount : 0

              return (
                <tr key={person.id} className="border-b border-border/60 last:border-b-0">
                  <td className="px-4 py-3">
                    <span className="font-medium">{person.full_name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {person.designation}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {formatPKR(salary)}
                  </td>
                  <td className="px-4 py-3">
                    {payment ? (
                      <Badge variant="success" className="text-sm">
                        Paid {payment.paidOn}
                      </Badge>
                    ) : (
                      <Badge variant="warning" className="text-sm">
                        Not paid
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                    {payment ? formatPKR(payment.amount) : <span className="text-muted-foreground">—</span>}
                    {payment && short !== 0 ? (
                      <span className="block text-sm font-normal text-muted-foreground">
                        {short > 0
                          ? `${formatPKR(short)} short`
                          : `${formatPKR(-short)} extra`}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {payment ? null : (
                      <PaySalaryButton
                        staffId={person.id}
                        staffName={person.full_name}
                        designation={person.designation}
                        monthlySalary={salary}
                        forMonth={month}
                      />
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        Each payment writes one expense to the ledger against that person and
        month. The same month cannot be paid twice.
      </p>
    </>
  )
}

function StaffTab({
  staff,
}: {
  staff: {
    id: string
    full_name: string
    designation: string
    monthly_salary: string
    phone: string | null
    joined_on: string
    is_active: boolean
  }[]
}) {
  if (staff.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No staff recorded yet."
        hint="Use “Add staff member” above to build the payroll."
      />
    )
  }

  const monthlyBill = staff
    .filter((s) => s.is_active)
    .reduce((sum, s) => sum + Number(s.monthly_salary), 0)

  return (
    <>
      <p className="text-base text-muted-foreground">
        {staff.filter((s) => s.is_active).length} working ·{" "}
        <span className="font-semibold whitespace-nowrap text-foreground tabular-nums">
          {formatPKR(monthlyBill)}
        </span>{" "}
        a month in agreed salaries
      </p>

      <div className="relative min-w-0 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[46rem] border-collapse text-base">
          <caption className="sr-only">Staff on the payroll</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">Name</th>
              <th scope="col" className="px-4 py-3 font-medium">Designation</th>
              <th scope="col" className="px-4 py-3 font-medium">Phone</th>
              <th scope="col" className="px-4 py-3 font-medium">Joined</th>
              <th scope="col" className="px-4 py-3 text-right font-medium">Monthly salary</th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <tr key={person.id} className="border-b border-border/60 last:border-b-0">
                <td className="px-4 py-3">
                  <span className="font-medium">{person.full_name}</span>
                  {person.is_active ? null : (
                    <Badge variant="neutral" className="ml-2 text-sm">
                      Left
                    </Badge>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{person.designation}</td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                  {person.phone ?? "—"}
                </td>
                <td className="px-4 py-3 whitespace-nowrap tabular-nums text-muted-foreground">
                  {person.joined_on}
                </td>
                <td className="px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums">
                  {formatPKR(Number(person.monthly_salary))}
                </td>
                <td className="px-4 py-3">
                  <EditStaffButton
                    staff={{
                      id: person.id,
                      fullName: person.full_name,
                      designation: person.designation,
                      monthlySalary: Number(person.monthly_salary),
                      phone: person.phone,
                      joinedOn: person.joined_on,
                      isActive: person.is_active,
                    } satisfies StaffRecord}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
