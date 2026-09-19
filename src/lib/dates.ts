/**
 * Clock access lives here rather than inline in components: the React Compiler
 * treats `Date.now()` in a render body as an impure call, and keeping it in one
 * module also makes these easy to stub in tests.
 */

const DAY_MS = 86_400_000

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10)
}

export function daysFromNowISO(days: number): string {
  return new Date(new Date().getTime() + days * DAY_MS).toISOString().slice(0, 10)
}

/** First day of the current month, as stored in salary_payments.for_month. */
export function monthStartISO(): string {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}
