const pkr = new Intl.NumberFormat("en-PK", {
  style: "currency",
  currency: "PKR",
  maximumFractionDigits: 0,
})

/** Money is always shown in whole rupees — paisa are not used in practice here. */
export function formatPKR(amount: number): string {
  return pkr.format(amount)
}

/**
 * Paediatric age. A neonate's age in days matters clinically, so this reports
 * days under a month and months under two years rather than rounding to "0 years".
 */
export function formatAge(dateOfBirth: string, on: Date = new Date()): string {
  const dob = new Date(dateOfBirth)
  const days = Math.max(0, Math.floor((on.getTime() - dob.getTime()) / 86_400_000))

  if (days < 31) return `${days} day${days === 1 ? "" : "s"}`

  const months = Math.floor(days / 30.44)
  if (months < 24) return `${months} month${months === 1 ? "" : "s"}`

  return `${Math.floor(days / 365.25)} years`
}

export function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}
