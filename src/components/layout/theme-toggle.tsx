"use client"

import type { MouseEvent } from "react"
import { flushSync } from "react-dom"
import { Moon, Sparkles, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useMounted } from "@/hooks/use-mounted"

/**
 * The light/dark switch in the topbar.
 *
 * Everything visual - which side the knob sits on, which icon it shows - is
 * CSS keyed off the .dark class on <html> (see .theme-switch in
 * globals.css), so it is correct from the first frame. React state is only
 * read for aria-checked, which is fine to settle a frame late.
 *
 * On a browser with the View Transitions API the new theme opens out as a
 * circle from the switch; elsewhere, or with reduced motion asked for, it
 * simply changes.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()
  const isDark = mounted && resolvedTheme === "dark"

  const toggle = (event: MouseEvent<HTMLButtonElement>) => {
    const root = document.documentElement
    // Read from the page rather than React state: the class is the truth the
    // user is looking at, and it is right even before hydration finishes.
    const next = root.classList.contains("dark") ? "light" : "dark"

    // next-themes applies its class from an effect, a render after setTheme.
    // The view transition snapshots the page as soon as this callback
    // returns, so the class is set here directly (next-themes then sets the
    // same one, harmlessly) and the React update is flushed synchronously so
    // anything reading resolvedTheme - the sidebar's icons - is already
    // swapped in the snapshot too.
    const apply = () => {
      root.classList.toggle("dark", next === "dark")
      root.style.colorScheme = next
      flushSync(() => setTheme(next))
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (typeof document.startViewTransition !== "function" || reduceMotion) {
      apply()
      return
    }

    const box = event.currentTarget.getBoundingClientRect()
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    // Far enough to reach the corner of the window furthest from the switch.
    const radius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    root.classList.add("theme-transition")
    const transition = document.startViewTransition(apply)

    transition.ready
      .then(() => {
        root.animate(
          {
            clipPath: [
              `circle(0px at ${x}px ${y}px)`,
              `circle(${radius}px at ${x}px ${y}px)`,
            ],
          },
          {
            duration: 600,
            easing: "cubic-bezier(0.22, 0.8, 0.24, 1)",
            pseudoElement: "::view-transition-new(root)",
          }
        )
      })
      .catch(() => {})

    transition.finished.finally(() => root.classList.remove("theme-transition"))
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark theme"
      title={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={toggle}
      className="theme-switch cursor-pointer"
    >
      <Moon
        aria-hidden
        className="theme-switch-hint right-2 size-3.5 text-sky-800/45 dark:opacity-0"
      />
      <Sparkles
        aria-hidden
        className="theme-switch-hint left-2 size-3.5 text-amber-100/70 opacity-0 dark:opacity-100"
      />
      <span className="theme-switch-knob">
        <Sun
          aria-hidden
          className="theme-switch-icon size-3.5 text-amber-500 dark:scale-0 dark:-rotate-90 dark:opacity-0"
        />
        <Moon
          aria-hidden
          className="theme-switch-icon size-3.5 scale-0 rotate-90 text-sky-200 opacity-0 dark:scale-100 dark:rotate-0 dark:opacity-100"
        />
      </span>
    </button>
  )
}
