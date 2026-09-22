"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { useMounted } from "@/hooks/use-mounted"

/**
 * A single light/dark switch, not a three-way light/dark/system picker: the
 * device's own preference is still the default (see theme-provider.tsx), this
 * button just lets someone override it here without digging into OS settings.
 *
 * resolvedTheme is undefined until mounted - next-themes cannot know the
 * persisted or system preference during server rendering, and guessing would
 * risk a flash of the wrong icon. The button renders visually identical
 * either way, so the one-frame delay is not worth a loading state for.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useMounted()

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  )
}
