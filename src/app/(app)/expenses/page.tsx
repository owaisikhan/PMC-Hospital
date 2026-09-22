import { UserPlus, Wallet } from "lucide-react"

import {
  RecordExpenseButton,
  ReverseExpenseButton,
} from "@/components/expenses/expense-dialogs"
import { MonthPicker } from "@/components/expenses/month-picker"
import { PaySalaryButton } from "@/components/expenses/salary-dialogs"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { SlidingTabs, type TabIconName, type TabItem } from "@/components/ui/sliding-tabs"
import { TabPanel } from "@/components/ui/tab-panel"
import { monthLabel, nextMonthStartISO, recentMonths } from "@/lib/dates"
import { formatPKR } from "@/lib/format"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/session"

export const metadata = { title: "Expenses" }

const TABS = ["expenses", "salaries"] as const
type ExpensesTab = (typeof TABS)[number]

const TAB_LABELS: Record<ExpensesTab, string> = {
  expenses: "Expenses",
  salaries: "Salaries",
}

const TAB_ICONS: Record<ExpensesTab, TabIconName> = {
  expenses: "wallet",
  salaries: "banknote",
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

interface SalaryPayment {
  id: string
  ledgerId: string
  amount: number
  paidOn: string
}

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
        .select("id, staff_id, amount, paid_on, ledger_id")
        .eq("for_month", month)
        .order("paid_on"),
    ])

  const expenses = (expensesResult.data ?? []) as ExpenseRow[]
  const reversed = new Set(
    (reversalsResult.data ?? []).map((r) => r.reverses_id as string),
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
  // A salary can be paid in instalments, so this sums them rather than
  // taking the first. A payment whose ledger entry has been reversed is money
  // that never left, so it does not count - without that check, reversing a
  // salary from the Expenses tab left the person still showing as paid here.
  const paidByStaff = new Map<string, { total: number; payments: SalaryPayment[] }>()
  for (const row of paymentsResult.data ?? []) {
    if (reversed.has(row.ledger_id as string)) continue
    const staffId = row.staff_id as string
    const entry = paidByStaff.get(staffId) ?? { total: 0, payments: [] }
    entry.total += Number(row.amount)
    entry.payments.push({
      id: row.id as string,
      ledgerId: row.ledger_id as string,
      amount: Number(row.amount),
      paidOn: row.paid_on as string,
    })
    paidByStaff.set(staffId, entry)
  }

  // Reversed entries are excluded from every total, matching money_summary.
  const live = expenses.filter((row) => !reversed.has(row.id))
  const monthTotal = live.reduce((sum, row) => sum + Number(row.amount), 0)

  const byCategory = new Map<string, number>()
  for (const row of live) {
    byCategory.set(
      row.expense_cat,
      (byCategory.get(row.expense_cat) ?? 0) + Number(row.amount),
    )
  }
  const categories = [...byCategory.entries()].sort((a, b) => b[1] - a[1])

  const activeStaff = allStaff.filter((s) => s.is_active)
  // Counted as paid only once the full salary is covered; someone owed the
  // rest of their month is not "paid".
  const paidCount = activeStaff.filter(
    (s) => (paidByStaff.get(s.id)?.total ?? 0) >= Number(s.monthly_salary),
  ).length
  const wageBill = activeStaff.reduce((sum, s) => sum + Number(s.monthly_salary), 0)
  const paidTotal = activeStaff.reduce(
    (sum, s) => sum + (paidByStaff.get(s.id)?.total ?? 0),
    0,
  )

  const tabItems: TabItem[] = TABS.map((key) => ({
    key,
    label: TAB_LABELS[key],
    icon: TAB_ICONS[key],
    href: `/expenses?tab=${key}&month=${month}`,
  }))

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Every rupee leaving PMC: running costs, salaries, and who is on the payroll."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SlidingTabs
              items={tabItems}
              active={tab}
              groupId="expenses-tab"
              ariaLabel="Expenses sections"
              size="large"
            />
            {tab === "expenses" ? <RecordExpenseButton /> : null}
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
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
            ) : (
              <SalariesTab staff={activeStaff} paidByStaff={paidByStaff} month={month} />
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
      {/* Where the month's money went, largest first. On a phone, two even
          columns fill the width rather than leaving a ragged gap on the right. */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {categories.map(([category, total]) => (
          <div
            key={category}
            className="flex min-w-0 flex-col gap-0.5 rounded-xl surface px-4 py-3"
          >
            <span className="text-sm text-muted-foreground">
              {CATEGORY_LABELS[category] ?? category}
            </span>
            {/* A half-width card on a small phone can be narrower than a
                seven-figure amount; there it may drop "Rs" onto its own line. */}
            <span className="text-lg font-semibold tabular-nums sm:whitespace-nowrap">
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
      <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
        <table className="stack-table w-full md:min-w-[48rem] border-collapse text-base">
          <caption className="sr-only">Expenses recorded in {monthLabel(month)}</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                Date
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Particulars
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Category
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Paid by
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Amount
              </th>
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
                  <td data-label="Date" className="px-4 py-3 whitespace-nowrap text-muted-foreground tabular-nums">
                    {row.occurred_on}
                  </td>
                  <td data-cell="primary" className="px-4 py-3">
                    <span
                      className={isReversed ? "text-muted-foreground line-through" : ""}
                    >
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
                  <td data-label="Category" className="px-4 py-3 whitespace-nowrap">
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
                  <td data-label="Paid by" className="px-4 py-3 capitalize whitespace-nowrap text-muted-foreground">
                    {row.method}
                  </td>
                  <td data-label="Amount"
                    className={`px-4 py-3 text-right font-semibold whitespace-nowrap tabular-nums${
                      isReversed ? " text-muted-foreground line-through" : ""
                    }`}
                  >
                    {formatPKR(Number(row.amount))}
                  </td>
                  <td data-cell="actions" className="px-4 py-3">
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
        A reversed entry stays on the record and is left out of every total. The ledger is
        never edited.
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
  paidByStaff: Map<string, { total: number; payments: SalaryPayment[] }>
  month: string
}) {
  if (staff.length === 0) {
    return (
      <EmptyState
        icon={UserPlus}
        title="Nobody is on the payroll yet."
        hint="Add people on the Staff page, then their salaries can be paid here."
      />
    )
  }

  return (
    <>
      <div className="relative min-w-0 overflow-x-auto rounded-xl surface">
        <table className="stack-table w-full md:min-w-[52rem] border-collapse text-base">
          <caption className="sr-only">Salary run for {monthLabel(month)}</caption>
          <thead>
            <tr className="border-b border-border text-left">
              <th scope="col" className="px-4 py-3 font-medium">
                Staff member
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Agreed salary
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right font-medium">
                Paid
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => {
              const entry = paidByStaff.get(person.id)
              const paid = entry?.total ?? 0
              const payments = entry?.payments ?? []
              const salary = Number(person.monthly_salary)
              const outstanding = salary - paid
              const lastPaidOn = payments.at(-1)?.paidOn

              return (
                <tr key={person.id} className="border-b border-border/60 last:border-b-0">
                  <td data-cell="primary" className="px-4 py-3">
                    <span className="font-medium">{person.full_name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {person.designation}
                    </span>
                  </td>

                  <td data-label="Agreed salary" className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    {formatPKR(salary)}
                  </td>

                  {/* The word carries the state, not the colour - a part
                      payment used to read "Paid" in green while most of the
                      salary was still owed. */}
                  <td data-label="Status" className="px-4 py-3">
                    {paid === 0 ? (
                      <Badge variant="warning" className="text-sm">
                        Not paid
                      </Badge>
                    ) : outstanding > 0 ? (
                      <Badge variant="destructive" className="text-sm">
                        Partially paid
                      </Badge>
                    ) : outstanding < 0 ? (
                      <Badge variant="info" className="text-sm">
                        Overpaid{lastPaidOn ? ` ${lastPaidOn}` : ""}
                      </Badge>
                    ) : (
                      <Badge variant="success" className="text-sm">
                        Paid{lastPaidOn ? ` ${lastPaidOn}` : ""}
                      </Badge>
                    )}
                  </td>

                  <td data-label="Paid" className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                    <span className="font-semibold">
                      {paid === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatPKR(paid)
                      )}
                    </span>
                    {outstanding > 0 && paid > 0 ? (
                      <span className="block text-sm font-normal text-destructive">
                        {formatPKR(outstanding)} still owed
                      </span>
                    ) : null}
                    {outstanding < 0 ? (
                      <span className="block text-sm font-normal text-muted-foreground">
                        {formatPKR(-outstanding)} extra
                      </span>
                    ) : null}

                    {/* Each instalment on its own line, so a mistaken one can
                        be reversed without touching the others. */}
                    {payments.length > 0 ? (
                      <span className="mt-1.5 flex flex-col items-end gap-1">
                        {payments.map((payment) => (
                          <span
                            key={payment.id}
                            className="flex items-center gap-2 text-sm font-normal text-muted-foreground"
                          >
                            {payment.paidOn} · {formatPKR(payment.amount)}
                            <ReverseExpenseButton
                              entryId={payment.ledgerId}
                              amount={payment.amount}
                              description={`Salary for ${person.full_name}, ${monthLabel(month)}`}
                            />
                          </span>
                        ))}
                      </span>
                    ) : null}
                  </td>

                  <td data-cell="actions" className="px-4 py-3">
                    {outstanding > 0 ? (
                      <PaySalaryButton
                        staffId={person.id}
                        staffName={person.full_name}
                        designation={person.designation}
                        monthlySalary={salary}
                        outstanding={outstanding}
                        forMonth={month}
                      />
                    ) : null}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        A salary can be paid in instalments; each one writes its own expense to
        the ledger against that person and month. Correct a mistake by reversing
        the instalment, which leaves both entries on the record.
      </p>
    </>
  )
}

