"use client"

import { useRouter } from "next/navigation"

import { controlClass } from "@/components/ui/field"
import { monthLabel } from "@/lib/dates"

/**
 * The month lives in the URL like every other filter here, so the figures are
 * server-rendered and a particular month can be shared or bookmarked.
 */
export function MonthPicker({
  months,
  active,
  tab,
}: {
  months: string[]
  active: string
  tab: string
}) {
  const router = useRouter()

  return (
    <label className="flex items-center gap-2 text-base">
      <span className="sr-only">Month</span>
      <select
        value={active}
        onChange={(event) =>
          router.push(`/expenses?tab=${tab}&month=${event.target.value}`, {
            scroll: false,
          })
        }
        className={`${controlClass} w-auto`}
        aria-label="Month"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {monthLabel(month)}
          </option>
        ))}
      </select>
    </label>
  )
}
