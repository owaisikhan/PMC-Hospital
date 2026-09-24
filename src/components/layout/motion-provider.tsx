"use client"

import { LazyMotion } from "motion/react"
import type { ReactNode } from "react"

// Fetched after first paint rather than bundled into every page: the engine
// was ~60 KB of the ~75 KB each page downloaded before it could respond, and
// none of it is needed until something actually animates.
const loadFeatures = () => import("@/components/motion-features").then((mod) => mod.default)

/**
 * Every animated element in the app is an `m.*` component (the light shell
 * of `motion.*`). Until the features arrive they render in their initial
 * state, so the page shows and works straight away; the animations join a
 * moment later.
 *
 * `strict` makes a stray `motion.*` throw in development, so a new component
 * cannot quietly pull the whole engine back into the first download.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  )
}
