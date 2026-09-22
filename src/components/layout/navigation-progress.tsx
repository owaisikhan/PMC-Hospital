"use client"

import { usePathname, useSearchParams } from "next/navigation"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { cn } from "@/lib/utils"

/**
 * A loading indicator for every in-app navigation, including the ones that
 * only change the query string (Today -> This week, a sort header, a filter,
 * the next page). Those keep the same route, so no loading.tsx skeleton
 * shows, and until the server answers the old figures just sit there.
 *
 * Two cues: a thin bar across the top of the window, and the page content
 * dimmed so the figures on screen read as the ones being replaced.
 *
 * Started by one click listener on the document rather than by each link, so
 * every <Link> in the app is covered, including ones added later, with no
 * change to them. Finished when the URL the router shows actually changes,
 * which for these routes is the moment the new page is rendered.
 */

/** Only show anything if it is still loading after this long, so a fast or
 *  prefetched navigation does not flash the bar. */
const SHOW_AFTER_MS = 120
/** Give up on anything that never finishes (a navigation that errored, or was
 *  redirected back to the same URL) rather than leave the page dimmed. */
const GIVE_UP_AFTER_MS = 15_000

type Phase = "idle" | "loading" | "done"

interface Progress {
  /**
   * Mark something as loading until the returned function is called. `dim`
   * also fades the page content - off for things like a search box, where
   * the person is still typing into the page being dimmed.
   */
  begin: (options: { dim: boolean }) => () => void
}

const ProgressContext = createContext<Progress | null>(null)

export function NavigationProgressProvider({ children }: { children: ReactNode }) {
  // Each thing currently loading, and whether it wants the content dimmed.
  const [active, setActive] = useState<Record<number, boolean>>({})
  const nextId = useRef(0)

  const begin = useCallback(({ dim }: { dim: boolean }) => {
    const id = nextId.current++
    setActive((current) => ({ ...current, [id]: dim }))
    let ended = false
    const end = () => {
      if (ended) return
      ended = true
      clearTimeout(giveUp)
      setActive((current) => {
        const rest = { ...current }
        delete rest[id]
        return rest
      })
    }
    // Whatever started it, nothing keeps the page dimmed forever.
    const giveUp = setTimeout(end, GIVE_UP_AFTER_MS)
    return end
  }, [])

  // Links: start on the click, finish when the router's URL moves.
  const endNavigation = useRef<(() => void) | null>(null)
  const pathname = usePathname()
  const search = useSearchParams().toString()

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }
      const anchor = (event.target as Element | null)?.closest?.("a[href]")
      if (!(anchor instanceof HTMLAnchorElement)) return
      if (anchor.target && anchor.target !== "_self") return
      if (anchor.hasAttribute("download")) return

      const next = new URL(anchor.href, window.location.href)
      if (next.origin !== window.location.origin) return
      // Same page, or only the #hash differs: nothing will load.
      if (next.pathname === window.location.pathname && next.search === window.location.search) {
        return
      }

      endNavigation.current?.()
      endNavigation.current = begin({ dim: true })
    }

    // Capture phase: <Link> calls preventDefault in its own handler, which
    // would hide the click from a bubbling listener that checks for it.
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [begin])

  useEffect(() => {
    endNavigation.current?.()
    endNavigation.current = null
  }, [pathname, search])

  const pending = Object.keys(active).length > 0
  const dim = Object.values(active).some(Boolean)

  // The bar's own life cycle, a step behind `pending`: it only appears after
  // SHOW_AFTER_MS, and on finishing it runs to the end and fades rather than
  // vanishing mid-way.
  const [phase, setPhase] = useState<Phase>("idle")
  useEffect(() => {
    if (pending) {
      const show = setTimeout(() => setPhase("loading"), SHOW_AFTER_MS)
      return () => clearTimeout(show)
    }
    const finish = setTimeout(() => setPhase((p) => (p === "loading" ? "done" : "idle")), 0)
    const reset = setTimeout(() => setPhase("idle"), 500)
    return () => {
      clearTimeout(finish)
      clearTimeout(reset)
    }
  }, [pending])

  // Stable, so useTrackPending's effect does not end and restart its own
  // entry every time this provider re-renders - which it does on each entry.
  const progress = useMemo(() => ({ begin }), [begin])

  return (
    <ProgressContext.Provider value={progress}>
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]">
        <div data-phase={phase} className="nav-progress h-full" />
      </div>
      <PendingContext.Provider value={phase === "loading" && dim}>
        {children}
      </PendingContext.Provider>
    </ProgressContext.Provider>
  )
}

const PendingContext = createContext(false)

/** The part of the page that dims while it is being replaced. */
export function PendingRegion({ children }: { children: ReactNode }) {
  const pending = useContext(PendingContext)
  return (
    <div
      aria-busy={pending || undefined}
      className={cn(
        "transition-opacity duration-300 ease-out",
        pending && "opacity-55 duration-200"
      )}
    >
      {children}
    </div>
  )
}

/**
 * For loading that is not a link click - a search box waiting on its
 * results, say. Shows the bar for as long as `isPending` is true.
 */
export function useTrackPending(isPending: boolean, options: { dim: boolean } = { dim: false }) {
  const progress = useContext(ProgressContext)
  const { dim } = options
  useEffect(() => {
    if (!isPending || !progress) return
    return progress.begin({ dim })
  }, [isPending, progress, dim])
}
