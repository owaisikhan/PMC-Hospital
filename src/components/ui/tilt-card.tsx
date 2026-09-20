"use client";

import { useRef, type PointerEvent, type ReactNode } from "react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";

import { cn } from "@/lib/utils";

/**
 * Degrees of lean at the very edge of the card. Deliberately small: these
 * cards carry money, and a steep lean skews the figures enough to slow
 * reading them.
 */
const MAX_TILT = 5;

/**
 * A card that leans toward the pointer in 3D.
 *
 * The pointer position is held in motion values rather than React state, so a
 * mouse crossing the card does not re-render anything - motion writes the
 * transform straight to the element. Only rotate and perspective are touched,
 * both of which the compositor handles, so nothing here triggers layout or
 * paint.
 *
 * Wraps its children rather than being a card itself, so the cards keep their
 * own markup and the tilt can be taken off again by deleting one element.
 */
export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Where the pointer sits across the card: -0.5 to 0.5 on each axis.
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);

  // A spring rather than the raw value, so the card keeps leaning for a moment
  // after the pointer stops and settles back instead of snapping flat.
  const settle = { stiffness: 260, damping: 26, mass: 0.6 };
  const smoothX = useSpring(pointerX, settle);
  const smoothY = useSpring(pointerY, settle);

  // The edge nearest the pointer lifts toward the viewer.
  const rotateX = useTransform(smoothY, [-0.5, 0.5], [-MAX_TILT, MAX_TILT]);
  const rotateY = useTransform(smoothX, [-0.5, 0.5], [MAX_TILT, -MAX_TILT]);

  const track = (event: PointerEvent<HTMLDivElement>) => {
    // Nothing for touch: there is no hover to lean into, and a finger dragging
    // across a card should scroll the page, not tip it.
    if (reduceMotion || event.pointerType !== "mouse" || !ref.current) return;
    const box = ref.current.getBoundingClientRect();
    pointerX.set((event.clientX - box.left) / box.width - 0.5);
    pointerY.set((event.clientY - box.top) / box.height - 0.5);
  };

  const release = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={track}
      onPointerLeave={release}
      // The perspective rides on the card's own transform, so each card leans
      // in its own right instead of sharing one vanishing point across the
      // grid, which would make cards at the edges look sheared.
      //
      // The markup and the rest state are identical whatever the motion
      // preference - only the handlers bail out. Rendering differently under
      // prefers-reduced-motion breaks hydration, because the server cannot
      // know the preference.
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      className={cn("h-full [&>*]:h-full", className)}
    >
      {children}
    </motion.div>
  );
}
