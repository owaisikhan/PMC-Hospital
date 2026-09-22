"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Search } from "lucide-react"

import { useTrackPending } from "@/components/layout/navigation-progress"
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

  /**
   * The query sent to the server and not yet answered. router.refresh()
   * gives nothing to await - and it runs its fetch outside any transition
   * wrapped around it, so useTransition reports done at once - but the
   * server's answer arrives as a new initialQuery. Loading is the gap between
   * the two, and any new initialQuery at all (an answer, or a link elsewhere
   * on the page that changed q) closes it.
   */
  const [awaiting, setAwaiting] = useState<string | null>(null)
  const [answered, setAnswered] = useState(initialQuery)
  if (answered !== initialQuery) {
    setAnswered(initialQuery)
    setAwaiting(null)
  }
  // The top-of-window bar only. No dimming: that would fade the very box
  // being typed into.
  useTrackPending(awaiting !== null && awaiting !== initialQuery)

  /**
   * Whether the person has actually typed something.
   *
   * Without this the debounce fires once on mount and rewrites the URL to the
   * carried filters alone - which drops ?page, so landing on page 2 of a list
   * bounced back to page 1 about a third of a second after it loaded. Nothing
   * should navigate until a key is pressed.
   */
  const [typed, setTyped] = useState(false)

  // Serialised, so the effect below compares by value rather than by a fresh
  // object identity on every render.
  const carried = JSON.stringify(carry)

  useEffect(() => {
    if (!typed) return
    const timer = setTimeout(() => {
      const next = new URLSearchParams(
        JSON.parse(carried) as Record<string, string>
      )
      if (value.trim()) next.set("q", value.trim())
      const queryString = next.toString()
      const target = queryString ? `${basePath}?${queryString}` : basePath
      // router.replace() silently does nothing when the target has no search
      // params at all and the current URL does - clearing the box then left
      // the stale q sitting in the address bar and in the list below. Setting
      // the URL directly and asking the router to refetch sidesteps that.
      window.history.replaceState(null, "", target)
      setAwaiting(value.trim())
      router.refresh()
    }, 300)
    return () => clearTimeout(timer)
    // Deliberately no `page`: a new search belongs on the first page of its
    // own results, not on whatever page number the last one had reached.
  }, [typed, value, carried, basePath, router])

  return (
    <div className="relative w-full sm:max-w-md">
      <Search
        className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => {
          setTyped(true)
          setValue(event.target.value)
        }}
        placeholder={placeholder}
        aria-label={label}
        className={`${controlClass} pl-10`}
      />
    </div>
  )
}
