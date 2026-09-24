"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { AnimatePresence, m, useReducedMotion } from "motion/react"
import { CheckCircle2, X, XCircle } from "lucide-react"

import { cn } from "@/lib/utils"

interface Toast {
  id: number
  message: string
  ok: boolean
}

type PushToast = (message: string, ok: boolean) => void

const ToastContext = createContext<PushToast>(() => {})

const LIFETIME_MS = 5000

/**
 * A running feed of what just happened, separate from the inline FormMessage
 * in whichever dialog produced it. The inline message only exists while that
 * dialog is open — a success closes it within ~1.6s — so a second person
 * watching the screen, or the same person a moment later, would otherwise see
 * nothing. Every server action already returns one ActionResult; this is the
 * one place all of them surface, success or refusal, expense or reversal.
 *
 * Mounted once in the app layout, above everything else it renders, so a
 * toast fired from any page's dialog lands in the same stack at the bottom
 * of the screen.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const reduceMotion = useReducedMotion()

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const pushToast = useCallback<PushToast>(
    (message, ok) => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, ok }])
      setTimeout(() => dismiss(id), LIFETIME_MS)
    },
    [dismiss]
  )

  return (
    <ToastContext.Provider value={pushToast}>
      {children}

      {/* Fixed to the viewport, not the scrolling <main> — an activity a
          moment ago should still be visible after scrolling a long table. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-stretch gap-2 p-4 sm:items-end"
      >
        <AnimatePresence>
          {toasts.map((toast) => {
            const Icon = toast.ok ? CheckCircle2 : XCircle
            return (
              <m.div
                key={toast.id}
                layout
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={
                  reduceMotion
                    ? { opacity: 0 }
                    : { opacity: 0, scale: 0.95, transition: { duration: 0.15 } }
                }
                transition={{ type: "spring", stiffness: 400, damping: 32, mass: 0.8 }}
                className={cn(
                  "pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-lg px-4 py-3 text-base shadow-lg ring-1 sm:w-auto",
                  toast.ok
                    ? "bg-success text-success-foreground ring-success/20"
                    : "bg-destructive text-destructive-foreground ring-destructive/20"
                )}
              >
                <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
                <span className="flex-1">{toast.message}</span>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Dismiss"
                  className="-mt-0.5 -mr-1 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </m.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext)
}
