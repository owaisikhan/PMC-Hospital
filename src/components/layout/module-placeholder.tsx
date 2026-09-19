import { Card, CardContent } from "@/components/ui/card"

interface ModulePlaceholderProps {
  /** What this module will hold once the reference screens are built out. */
  planned: string[]
}

/**
 * Temporary body for modules that are routed and navigable but not yet
 * designed. Replaced screen-by-screen as reference designs arrive.
 */
export function ModulePlaceholder({ planned }: ModulePlaceholderProps) {
  return (
    <Card className="max-w-2xl">
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">
          This module is routed and wired into the navigation. The screens below are
          next up.
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {planned.map((entry) => (
            <li key={entry} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden
                className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/50"
              />
              {entry}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
