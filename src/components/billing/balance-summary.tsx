import type { AdmissionBalance } from "@/lib/billing"
import { formatPKR } from "@/lib/format"
import { cn } from "@/lib/utils"

/**
 * Charges, concession, paid and owed as one block. The owed figure is the one
 * people check, so it is the largest and carries a word as well as a colour.
 */
export function BalanceSummary({
  balance,
  className,
}: {
  balance: AdmissionBalance
  className?: string
}) {
  const settled = balance.balance <= 0
  const inCredit = balance.balance < 0

  // Negating zero gives -0, which Intl renders as "-Rs 0". Normalise it away.
  const negated = (n: number) => (n === 0 ? 0 : -n)

  const rows: { label: string; value: number }[] = [
    { label: "Charges", value: balance.totalCharges },
    ...(balance.totalDiscount > 0
      ? [{ label: "Concession", value: negated(balance.totalDiscount) }]
      : []),
    { label: "Paid", value: negated(balance.totalPaid) },
  ]

  return (
    <div className={cn("flex flex-wrap items-end gap-x-8 gap-y-3", className)}>
      {rows.map((row) => (
        <div key={row.label} className="flex flex-col gap-0.5">
          <span className="text-sm text-muted-foreground">{row.label}</span>
          <span className="text-lg font-medium whitespace-nowrap tabular-nums">
            {row.value < 0 ? `− ${formatPKR(Math.abs(row.value))}` : formatPKR(row.value)}
          </span>
        </div>
      ))}

      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted-foreground">
          {inCredit ? "In credit" : settled ? "Settled" : "Still owed"}
        </span>
        <span
          className={cn(
            "text-2xl font-semibold tracking-tight whitespace-nowrap tabular-nums",
            settled ? "text-success" : "text-destructive"
          )}
        >
          {formatPKR(Math.abs(balance.balance))}
        </span>
      </div>
    </div>
  )
}
