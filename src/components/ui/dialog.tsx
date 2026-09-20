"use client"

import { useEffect, useRef } from "react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

/**
 * Native <dialog> with showModal(): focus trapping, Escape, the inert
 * background and the backdrop all come from the browser already correct.
 * motion animates the panel on top of that.
 *
 * The element stays open while the exit animation runs and is closed only in
 * onExitComplete - calling close() on the state change would remove it from
 * the top layer immediately and there would be nothing left to animate out.
 *
 * Deliberately no click-outside-to-close. A click event fires on the nearest
 * common ancestor of mousedown and mouseup, so selecting text in a field and
 * releasing a few pixels past the panel edge is indistinguishable from a
 * backdrop click - and would throw away a half-typed patient record.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (open && !el.open) el.showModal()
  }, [open])

  const transition = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 320, damping: 30, mass: 0.8 }

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      aria-labelledby="dialog-title"
      className={cn(
        "m-0 max-h-dvh w-full max-w-xl bg-transparent p-0",
        "max-sm:h-dvh max-sm:max-w-none",
        "sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2",
        // showModal() paints this in the top layer, but CSS still inherits down
        // the DOM tree, so a dialog opened from inside a right-aligned,
        // no-wrap, tabular-figures table cell came out right-aligned with its
        // description refusing to wrap. Reset the inherited text properties
        // here, so a dialog looks the same wherever it is mounted from.
        "text-left whitespace-normal normal-nums",
        className
      )}
    >
      <AnimatePresence onExitComplete={() => ref.current?.close()}>
        {open ? (
          <motion.div
            key="panel"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 8 }}
            transition={transition}
            className="flex max-h-dvh flex-col overflow-hidden bg-card text-card-foreground shadow-2xl sm:max-h-[92dvh] sm:rounded-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex flex-col gap-0.5">
                <h2 id="dialog-title" className="text-lg font-semibold tracking-tight">
                  {title}
                </h2>
                {description ? (
                  <p className="text-base text-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="-mt-1 -mr-1 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            {/* dialog-body hides the scrollbar chrome; the forms are laid out
                to fit, so the bar would only ever be a sliver of clutter. */}
            <div className="dialog-body overflow-y-auto px-5 py-4">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </dialog>
  )
}
