"use client"

import { useState, type ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

/**
 * The region a segmented control filters. When the selection changes the new
 * content fades in, sliding a little from the side the selection moved from,
 * so the change reads as a panel arriving rather than figures silently
 * rewriting themselves.
 *
 * The first render is deliberately not animated. motion writes `initial` into
 * the server-rendered markup, so animating from opacity 0 on first paint would
 * leave the page blank until hydration - and blank for good if the JavaScript
 * never arrives. Nothing is hidden that the server has already sent.
 */
export function TabPanel({
  panelKey,
  index,
  children,
}: {
  /** Changes when the selection changes; remounts the panel. */
  panelKey: string
  /** Position of the selection, so the slide follows the direction of travel. */
  index: number
  children: ReactNode
}) {
  const reduceMotion = useReducedMotion()

  const [lastIndex, setLastIndex] = useState(index)
  const [direction, setDirection] = useState(0)
  const [hasChanged, setHasChanged] = useState(false)

  // Derived during render rather than in an effect, so the panel never paints
  // once in the wrong place and then corrects itself.
  if (lastIndex !== index) {
    setDirection(Math.sign(index - lastIndex))
    setLastIndex(index)
    setHasChanged(true)
  }

  return (
    <motion.div
      key={panelKey}
      // Skipping `initial` under prefers-reduced-motion, not just zeroing the
      // duration: a zero-length transition still paints one frame at the
      // initial value, which flashed the panel blank. Safe to branch on the
      // preference here because hasChanged is false on the only render that
      // hydrates, so server and client still agree.
      initial={hasChanged && !reduceMotion ? { opacity: 0, x: direction * 14 } : false}
      animate={{ opacity: 1, x: 0 }}
      // Opacity and transform only. The reference blurs the outgoing panel,
      // but blur cannot be composited - it repaints every frame - and these
      // panels are full of figures someone is reading off a screen.
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.26, ease: [0.22, 1, 0.36, 1] }
      }
    >
      {children}
    </motion.div>
  )
}
