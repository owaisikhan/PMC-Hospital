"use client"

import { useState } from "react"
import { BedDouble, RefreshCw } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPKR, pluralize } from "@/lib/format"

interface FlipRevenueCardProps {
  label: string
  amount: number
  /** How many admissions started in the period. */
  count: number
  sharePercent?: number
}

/**
 * The icon is imported here rather than taken as a prop. A Lucide icon is a
 * React component, and a component cannot be serialised across the
 * server-to-client boundary - passing it in threw "Functions cannot be passed
 * directly to Client Components" at request time while still building cleanly.
 */

/**
 * The admissions card shows money by default and the number of admissions when
 * clicked. Built as a real <button>, so it works from the keyboard and is
 * announced as a control rather than looking like decoration; the face that is
 * hidden is also hidden from screen readers, so only one figure is read out.
 */
export function FlipRevenueCard({
  label,
  amount,
  count,
  sharePercent,
}: FlipRevenueCardProps) {
  const [flipped, setFlipped] = useState(false)

  const face = (
    primary: string,
    caption: string,
    meter: boolean,
    hidden: boolean
  ) => (
    <CardContent
      aria-hidden={hidden}
      className="flex h-full flex-col gap-2 pt-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{label}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <BedDouble className="size-4" aria-hidden />
        </span>
      </div>

      <p className="text-xl font-semibold tracking-tight whitespace-nowrap tabular-nums sm:text-2xl">
        {primary}
      </p>

      {meter && sharePercent !== undefined ? (
        <div className="flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.min(100, sharePercent)}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round(sharePercent)}%
          </span>
        </div>
      ) : (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RefreshCw className="size-3" aria-hidden />
          {caption}
        </p>
      )}
    </CardContent>
  )

  return (
    <div className="flip-scene">
      <button
        type="button"
        onClick={() => setFlipped((previous) => !previous)}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `${label}: ${pluralize(count, "admission")} this period. Show income instead.`
            : `${label}: ${formatPKR(amount)} income. Show the number of admissions instead.`
        }
        className="block w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flip-inner" data-flipped={flipped}>
          <Card className="flip-face">
            {face(formatPKR(amount), "Tap for the number of admissions", true, flipped)}
          </Card>
          <Card className="flip-face flip-face-back">
            {face(
              pluralize(count, "admission"),
              "Tap for the income",
              false,
              !flipped
            )}
          </Card>
        </div>
      </button>

      {/* Announced on change, so the new figure is read without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {flipped
          ? `${pluralize(count, "admission")} this period`
          : `${formatPKR(amount)} from admissions this period`}
      </p>
    </div>
  )
}
