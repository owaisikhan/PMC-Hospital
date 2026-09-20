"use client"

import { useCallback, useEffect, useRef } from "react"

import type { ActionResult } from "@/lib/actions"

/**
 * Keeps what someone typed when a server action refuses the submission.
 *
 * React 19 resets the form once a form action completes - including when it is
 * refused. Everything typed is wiped, and a controlled field whose state did
 * not change is worse still: React sees no difference, does not re-patch the
 * DOM, and the field silently submits a different value from the one on
 * screen. A concession refused for being too large took its reason with it,
 * and a lab test marked "Resulted" without a note came back saying "Ordered".
 *
 * The refusal message is the whole interaction at that moment, so the entry it
 * refers to has to survive. Values are captured on submit and written back
 * afterwards, restoring exactly what the reset undid.
 *
 * Usage:
 *   const { formRef, captureValues } = useFormValues(result)
 *   <form ref={formRef} action={action} onSubmit={captureValues}>
 */
export function useFormValues(result: ActionResult | null) {
  const formRef = useRef<HTMLFormElement>(null)
  const captured = useRef<{ name: string; value: string; checked: boolean }[]>([])

  const captureValues = useCallback(() => {
    const form = formRef.current
    if (!form) return
    captured.current = Array.from(form.elements)
      .filter(
        (element): element is HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement =>
          (element instanceof HTMLInputElement ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement) &&
          element.name !== ""
      )
      // Read checked as well as value: an unchecked box is absent from
      // FormData, so a box the person deliberately cleared would come back
      // ticked.
      .map((element) => ({
        name: element.name,
        value: element.value,
        checked: element instanceof HTMLInputElement ? element.checked : false,
      }))
  }, [])

  useEffect(() => {
    // Only on refusal. A success closes the dialog, and putting the old values
    // back would fight anything the caller resets deliberately.
    if (!result || result.ok) return
    const form = formRef.current
    if (!form) return

    for (const field of captured.current) {
      const element = form.elements.namedItem(field.name)
      if (
        element instanceof HTMLInputElement &&
        (element.type === "checkbox" || element.type === "radio")
      ) {
        element.checked = field.checked
      } else if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
      ) {
        element.value = field.value
      }
    }
  }, [result])

  return { formRef, captureValues }
}
