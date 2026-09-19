import { cn } from "@/lib/utils"

interface FieldProps {
  label: string
  htmlFor: string
  /** Shown under the label; never used for anything that carries meaning. */
  hint?: string
  required?: boolean
  children: React.ReactNode
  className?: string
}

/** Label above control, 16px, always visible — never a placeholder-as-label. */
export function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
  className,
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-base font-medium">
        {label}
        {required ? (
          <span className="text-destructive" aria-hidden>
            {" "}
            *
          </span>
        ) : (
          <span className="font-normal text-muted-foreground"> (optional)</span>
        )}
      </label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )
}

/** Shared control styling: 44px tall, 16px text — no zoom-on-focus on iOS. */
export const controlClass =
  "h-11 w-full rounded-lg border border-input bg-background px-3 text-base shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
