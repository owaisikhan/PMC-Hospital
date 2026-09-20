"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { controlClass } from "@/components/ui/field"

/**
 * A search box whose term lives in the URL, so results stay server-rendered,
 * a search can be shared or bookmarked, and the Back button walks through
 * searches rather than leaving the page.
 *
 * Debounced, so a round trip does not fire on every keystroke, and
 * scroll is preserved because only the list below changes.
 */
export function UrlSearch({
  basePath,
  initialQuery,
  /**
   * The other filters on the page. They ride along on every search, or
   * typing would silently reset whichever tab the person had chosen.
   */
  carry,
  placeholder,
  label,
}: {
  basePath: string
  initialQuery: string
  carry: Record<string, string>
  placeholder: string
  label: string
}) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery)

  // Serialised, so the effect below compares by value rather than by a fresh
  // object identity on every render.
  const carried = JSON.stringify(carry)

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(
        JSON.parse(carried) as Record<string, string>
      )
      if (value.trim()) next.set("q", value.trim())
      router.replace(`${basePath}?${next.toString()}`, { scroll: false })
    }, 300)
    return () => clearTimeout(timer)
  }, [value, carried, basePath, router])

  return (
    <div className="relative w-full sm:max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className={`${controlClass} pl-10`}
      />
    </div>
  )
}
