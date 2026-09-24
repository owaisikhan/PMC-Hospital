"use client"

import { m, useReducedMotion } from "motion/react"

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
      <m.span
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

/**
 * A placeholder bar sitting in a box of the real text's line height.
 *
 * The bar is shorter than the line so it reads as text rather than a slab,
 * but the box around it is the exact height the real line will occupy.
 * Sizing the bars alone leaves rows short, and the page jumps when the data
 * lands - the one thing a skeleton exists to prevent.
 *
 * Line heights: h-7 for text-xl/text-lg, h-6 for text-base, h-5 for text-sm.
 */
export function SkeletonLine({
  line,
  bar,
  width,
  delay = 0,
  align = "left",
}: {
  line: string
  bar: string
  width: string
  delay?: number
  align?: "left" | "right"
}) {
  return (
    <span
      className={cn(
        "flex items-center",
        line,
        align === "right" && "justify-end"
      )}
    >
      <Skeleton className={cn(bar, width)} delay={delay} />
    </span>
  )
}
