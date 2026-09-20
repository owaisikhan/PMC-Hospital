"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

export interface TabItem {
  /** Stable value, matched against `active`. */
  key: string
  label: string
  href: string
}

/**
 * A segmented control whose active pill slides between labels.
 *
 * The pill is one element moved by motion's shared-layout animation rather
 * than a background colour swapped between items, so it travels between
 * labels instead of blinking from one to the next.
 *
 * Props are plain data - no icons, no callbacks - so this stays safe to render
 * from the server components that use it.
 */
export function SlidingTabs({
  items,
  active,
  groupId,
  ariaLabel,
  size = "default",
}: {
  items: TabItem[]
  active: string
  /** Unique per control: two groups sharing a layoutId would fight over one pill. */
  groupId: string
  ariaLabel: string
  size?: "default" | "large"
}) {
  const reduceMotion = useReducedMotion()

  // Where the pill is drawn. Kept separately from `active` so a click moves it
  // at once, rather than after the server has re-rendered the page behind it.
  const [pill, setPill] = useState(active)
  const [lastActive, setLastActive] = useState(active)

  // Re-sync when the server catches up, and when Back or Forward changes the
  // filter without anything here being clicked. Adjusting state during render
  // rather than in an effect, so the pill never paints in the wrong place
  // first.
  if (lastActive !== active) {
    setLastActive(active)
    setPill(active)
  }

  const padding = size === "large" ? "px-3.5 py-2 text-base" : "px-3 py-1.5 text-sm"

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex rounded-lg border border-border bg-card p-0.5"
    >
      {items.map((item) => {
        const isActive = item.key === active
        const hasPill = item.key === pill

        const body = (
          <>
            {hasPill ? (
              <motion.span
                layoutId={`${groupId}-pill`}
                aria-hidden
                className="absolute inset-0 rounded-md bg-primary"
                transition={
                  reduceMotion
                    ? { duration: 0 }
                    : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
                }
              />
            ) : null}
            {/* Above the pill, so the label is not painted over mid-slide. */}
            <span className="relative z-10">{item.label}</span>
          </>
        )

        const shape = cn(
          "relative rounded-md font-medium transition-colors",
          padding,
          hasPill ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
        )

        // The selected item is a span, not a link back to the page you are
        // already on - the same rule the pager follows.
        return isActive ? (
          <span key={item.key} aria-current="true" className={shape}>
            {body}
          </span>
        ) : (
          <Link
            key={item.key}
            href={item.href}
            scroll={false}
            onClick={() => setPill(item.key)}
            className={shape}
          >
            {body}
          </Link>
        )
      })}
    </div>
  )
}
