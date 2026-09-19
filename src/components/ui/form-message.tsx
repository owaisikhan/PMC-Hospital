import { CheckCircle2, XCircle } from "lucide-react"

import type { ActionResult } from "@/lib/actions"
import { cn } from "@/lib/utils"

/**
 * One renderer for every action result. The icon is a second cue beside the
 * colour, because colour alone fails in poor light and for a red-green
 * colourblind reader.
 */
export function FormMessage({ result }: { result: ActionResult | null }) {
  if (!result) return null

  const Icon = result.ok ? CheckCircle2 : XCircle

  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-base",
        result.ok ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
      )}
    >
      <Icon className="mt-0.5 size-4.5 shrink-0" aria-hidden />
      <span>{result.message}</span>
    </p>
  )
}
