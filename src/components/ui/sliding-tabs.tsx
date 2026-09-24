"use client"

import Link from "next/link"
import { useState } from "react"
import { motion, useReducedMotion } from "motion/react"

import {
  BedsIcon,
  LabIcon,
  PatientsIcon,
  PersonIcon,
  SalariesIcon,
  ShieldIcon,
  WalletIcon,
  type BadgeIcon,
} from "@/components/badge-icons"
import { cn } from "@/lib/utils"

/**
 * Icons are looked up by name rather than passed in.
 *
 * An icon is a React component, and a component cannot be serialised
 * across the server-to-client boundary - handing one to this component as a
 * prop throws "Functions cannot be passed directly to Client Components" at
 * request time while still building cleanly. The server components that render
 * these tabs send a string; the mapping happens here, on the client.
 */
const TAB_ICONS = {
  wallet: WalletIcon,
  banknote: SalariesIcon,
  bed: BedsIcon,
  users: PatientsIcon,
  user: PersonIcon,
  shield: ShieldIcon,
  flask: LabIcon,
} satisfies Record<string, BadgeIcon>

export type TabIconName = keyof typeof TAB_ICONS

export interface TabItem {
  /** Stable value, matched against `active`. */
  key: string
  label: string
  href: string
  /** Optional icon, by name - see TAB_ICONS above for why it is not a component. */
  icon?: TabIconName
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
        const Icon = item.icon ? TAB_ICONS[item.icon] : null

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
            {/* Above the pill, so neither is painted over mid-slide. The icon
                is a colour badge (badge-icons.tsx) that reads on the pill and
                off it alike. */}
            <span className="relative z-10 flex items-center gap-2">
              {Icon ? (
                <Icon className={cn("shrink-0", size === "large" ? "size-6" : "size-5")} />
              ) : null}
              {item.label}
            </span>
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
            // Fetched in full as soon as the tabs are on screen, so the first
            // switch to a tab shows it at once instead of waiting on the
            // server. A tab group is two or three links, so this costs a
            // couple of small background requests per page.
            prefetch={true}
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
