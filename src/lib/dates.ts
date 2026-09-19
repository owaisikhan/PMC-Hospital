/**
 * Clock access lives here rather than inline in components: the React Compiler
 * treats `Date.now()` in a render body as an impure call, and keeping it in one
 * module also makes these easy to stub in tests.
 *
 * Every date here is PMC's *business* day (Asia/Karachi), not the server's.
 * The server runs in UTC, where from 19:00 onwards it is already tomorrow in
 * Pakistan — so a payment taken at 1am would otherwise be filed under
 * yesterday. The database has a matching `pmc_today()`.
 */

export const BUSINESS_TIME_ZONE = "Asia/Karachi"

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

/** Today in Karachi, as YYYY-MM-DD. */
export function todayISO(): string {
  return isoFormatter.format(new Date())
}

/** Shifts a YYYY-MM-DD string by whole days without touching timezones. */
export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number)
  const shifted = new Date(Date.UTC(y, m - 1, d + days))
  return shifted.toISOString().slice(0, 10)
}

export function daysFromNowISO(days: number): string {
  return addDaysISO(todayISO(), days)
}

export type Period = "day" | "week" | "month"

export const PERIOD_LABELS: Record<Period, string> = {
  day: "Today",
  week: "This week",
  month: "This month",
}

export function isPeriod(value: string | undefined): value is Period {
  return value === "day" || value === "week" || value === "month"
}

export interface DateRange {
  from: string
  to: string
  label: string
}

/**
 * Inclusive range for a dashboard period, always ending today.
 *
 * "This week" runs from Monday, and "this month" from the 1st — an owner
 * checking takings wants the period so far, not a rolling window that quietly
 * includes part of last month.
 */
export function periodRange(period: Period, today = todayISO()): DateRange {
  const [y, m, d] = today.split("-").map(Number)

  if (period === "day") {
    return { from: today, to: today, label: PERIOD_LABELS.day }
  }

  if (period === "month") {
    const first = `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-01`
    return { from: first, to: today, label: PERIOD_LABELS.month }
  }

  // Monday-start week. getUTCDay() gives 0 for Sunday, so map it to 6.
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  const sinceMonday = weekday === 0 ? 6 : weekday - 1
  return { from: addDaysISO(today, -sinceMonday), to: today, label: PERIOD_LABELS.week }
}
