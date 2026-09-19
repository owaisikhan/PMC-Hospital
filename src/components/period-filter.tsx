import Link from "next/link"

import { PERIOD_LABELS, type Period } from "@/lib/dates"
import { cn } from "@/lib/utils"

const PERIODS: Period[] = ["day", "week", "month"]

/**
 * Plain links rather than a client-side control: the period lives in the URL,
 * so the figures are server-rendered, shareable and survive a refresh.
 */
export function PeriodFilter({ active }: { active: Period }) {
  return (
    <div
      role="group"
      aria-label="Time period"
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {PERIODS.map((period) => {
        const isActive = period === active
        return (
          <Link
            key={period}
            href={`/?period=${period}`}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {PERIOD_LABELS[period]}
          </Link>
        )
      })}
    </div>
  )
}
