"use client"

import { useState } from "react"
import { BedDouble, RefreshCw, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPKR, pluralize } from "@/lib/format"

interface FlipRevenueCardProps {
  label: string
  amount: number
  /**
   * Every child ever registered at PMC. Deliberately all-time, while the
   * money on the front is scoped to the chosen period - the captions on both
   * faces say which, so "10 patients" is not read as ten patients today.
   */
  patientCount: number
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
  patientCount,
  sharePercent,
}: FlipRevenueCardProps) {
  const [flipped, setFlipped] = useState(false)

  // Each face carries its own heading: the back is a headcount, not money,
  // so labelling it "Admissions" read as if 10 people were admitted.
  const face = (
    title: string,
    primary: string,
    caption: string,
    meter: boolean,
    hidden: boolean
  ) => {
    const Icon = meter ? BedDouble : Users
    return (
    <CardContent
      aria-hidden={hidden}
      className="flex h-full flex-col gap-2 pt-5 text-left"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-muted-foreground">{title}</p>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
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
  }

  return (
    <div className="flip-scene">
      <button
        type="button"
        onClick={() => setFlipped((previous) => !previous)}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `${pluralize(patientCount, "patient")} registered at PMC in total. Show admissions income instead.`
            : `${label}: ${formatPKR(amount)} income for this period. Show the total number of registered patients instead.`
        }
        className="block w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <div className="flip-inner" data-flipped={flipped}>
          <Card className="flip-face">
            {face(label, formatPKR(amount), "Tap for total patients", true, flipped)}
          </Card>
          <Card className="flip-face flip-face-back">
            {face(
              "Patients",
              pluralize(patientCount, "patient"),
              "Registered at PMC · all time",
              false,
              !flipped
            )}
          </Card>
        </div>
      </button>

      {/* Announced on change, so the new figure is read without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {flipped
          ? `${pluralize(patientCount, "patient")} registered at PMC in total`
          : `${formatPKR(amount)} from admissions this period`}
      </p>
    </div>
  )
}
