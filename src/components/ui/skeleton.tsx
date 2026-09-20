"use client"

import { motion, useReducedMotion } from "motion/react"

import { cn } from "@/lib/utils"

interface SkeletonProps {
  className?: string
  /**
   * Seconds to delay the sweep. Staggering rows makes the list read as one
   * surface filling in, rather than a grid of things flashing independently.
   */
  delay?: number
}

/**
 * A placeholder block with a highlight sweeping across it.
 *
 * The sweep is a gradient translated by motion inside an overflow-hidden box,
 * rather than an animated background-position: transform is composited on the
 * GPU, so a page full of these does not repaint on every frame.
 */
export function Skeleton({ className, delay = 0 }: SkeletonProps) {
  const reduceMotion = useReducedMotion()

  return (
    <span
      aria-hidden
      className={cn("relative block overflow-hidden rounded-md bg-muted", className)}
    >
      {/* The sweep is always in the markup, never conditionally rendered: the
          server has no way to know the viewer's motion preference, so dropping
          the element on the client produced a hydration mismatch. Under
          prefers-reduced-motion it just stays parked off to the left, where
          overflow-hidden clips it, leaving the plain block - which still reads
          as "not loaded yet". */}
      <motion.span
        className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-transparent via-foreground/10 to-transparent"
        initial={{ x: "-100%" }}
        animate={{ x: reduceMotion ? "-100%" : "100%" }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : {
                duration: 1.3,
                ease: "linear",
                repeat: Infinity,
                repeatDelay: 0.25,
                delay,
              }
        }
      />
    </span>
  )
}
