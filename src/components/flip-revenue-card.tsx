"use client"

import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"
import { BedDouble, RefreshCw, Users } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { formatPKR, pluralize } from "@/lib/format"

interface FlipRevenueCardProps {
  label: string
  amount: number
  /** Children registered inside the same period as the money on the front. */
  patientCount: number
  /** Human-readable period, e.g. "this week", used in the captions. */
  periodLabel: string
  sharePercent?: number
}

/**
 * The icons are imported here rather than taken as props. A Lucide icon is a
 * React component, and a component cannot be serialised across the
 * server-to-client boundary - passing one in threw "Functions cannot be passed
 * directly to Client Components" at request time while still building cleanly.
 */
export function FlipRevenueCard({
  label,
  amount,
  patientCount,
  periodLabel,
  sharePercent,
}: FlipRevenueCardProps) {
  const [flipped, setFlipped] = useState(false)
  const reduceMotion = useReducedMotion()

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
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, sharePercent)}%` }}
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 120, damping: 20 }
                }
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
      <motion.button
        type="button"
        onClick={() => setFlipped((previous) => !previous)}
        aria-pressed={flipped}
        aria-label={
          flipped
            ? `${pluralize(patientCount, "patient")} registered ${periodLabel}. Show admissions income instead.`
            : `${label}: ${formatPKR(amount)} income ${periodLabel}. Show the number of patients registered instead.`
        }
        className="block w-full rounded-xl text-left focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        whileTap={reduceMotion ? undefined : { scale: 0.98 }}
      >
        <motion.div
          className="relative"
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: flipped ? 180 : 0 }}
          // A spring reads as the card having weight; someone who has asked for
          // less motion still gets the new figure, just without the turn.
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 30, mass: 0.9 }
          }
        >
          <Card className="flip-face">
            {face(
              label,
              formatPKR(amount),
              "Tap for patients registered",
              true,
              flipped
            )}
          </Card>
          <Card className="flip-face flip-face-back">
            {face(
              "Patients",
              pluralize(patientCount, "patient"),
              `Registered ${periodLabel}`,
              false,
              !flipped
            )}
          </Card>
        </motion.div>
      </motion.button>

      {/* Announced on change, so the new figure is read without moving focus. */}
      <p className="sr-only" aria-live="polite">
        {flipped
          ? `${pluralize(patientCount, "patient")} registered ${periodLabel}`
          : `${formatPKR(amount)} from admissions ${periodLabel}`}
      </p>
    </div>
  )
}
