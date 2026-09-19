import type { IncomeCategory } from "@/types"

/** One row as returned by the `money_summary` RPC. */
export interface MoneySummaryRow {
  direction: "in" | "out"
  category: string
  total: number | string
}

export interface MoneyTotals {
  income: Record<IncomeCategory, number>
  totalIncome: number
  totalExpenses: number
  net: number
}

const EMPTY_INCOME: Record<IncomeCategory, number> = {
  admission: 0,
  pharmacy: 0,
  lab: 0,
  other: 0,
}

/**
 * Folds the RPC rows into the shape the dashboard renders. Staff get an empty
 * array back from the RPC because row level security hides the ledger from
 * them, which lands here as clean zeroes rather than an error.
 */
export function foldMoneySummary(rows: MoneySummaryRow[] | null): MoneyTotals {
  const income = { ...EMPTY_INCOME }
  let totalExpenses = 0

  for (const row of rows ?? []) {
    const amount = Number(row.total) || 0
    if (row.direction === "in") {
      if (row.category in income) {
        income[row.category as IncomeCategory] += amount
      }
    } else {
      totalExpenses += amount
    }
  }

  const totalIncome = Object.values(income).reduce((sum, n) => sum + n, 0)

  return { income, totalIncome, totalExpenses, net: totalIncome - totalExpenses }
}
