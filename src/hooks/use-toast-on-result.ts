"use client"

import { useEffect } from "react"

import { useToast } from "@/components/layout/toast-context"
import type { ActionResult } from "@/lib/actions"

/**
 * Surfaces every action result in the bottom toast stack, on top of whatever
 * that dialog already shows inline via FormMessage.
 *
 * useActionState hands back a new result object each time the action
 * completes, so an effect keyed on `result` fires exactly once per dispatch
 * — never on the initial null state, never again on an unrelated re-render.
 */
export function useToastOnResult(result: ActionResult | null) {
  const pushToast = useToast()
  useEffect(() => {
    if (result) pushToast(result.message, result.ok)
  }, [result, pushToast])
}
