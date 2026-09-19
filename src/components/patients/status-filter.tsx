import Link from "next/link"

import { cn } from "@/lib/utils"

export type PatientFilter = "admitted" | "all"

export const FILTER_LABELS: Record<PatientFilter, string> = {
  admitted: "Admitted now",
  all: "All patients",
}

export function isPatientFilter(value: string | undefined): value is PatientFilter {
  return value === "admitted" || value === "all"
}

/**
 * The selected chip is a span, not a link back to the page you are already on.
 * The search term rides along, so changing the filter does not silently wipe it.
 */
export function StatusFilter({
  active,
  query,
}: {
  active: PatientFilter
  query: string
}) {
  const base = "rounded-md px-3.5 py-2 text-base font-medium transition-colors"

  return (
    <div
      role="group"
      aria-label="Filter patients"
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {(Object.keys(FILTER_LABELS) as PatientFilter[]).map((filter) => {
        if (filter === active) {
          return (
            <span
              key={filter}
              aria-current="true"
              className={cn(base, "bg-primary text-primary-foreground")}
            >
              {FILTER_LABELS[filter]}
            </span>
          )
        }

        const params = new URLSearchParams()
        if (query) params.set("q", query)
        params.set("show", filter)

        return (
          <Link
            key={filter}
            href={`/patients?${params.toString()}`}
            scroll={false}
            className={cn(base, "text-muted-foreground hover:text-foreground")}
          >
            {FILTER_LABELS[filter]}
          </Link>
        )
      })}
    </div>
  )
}
