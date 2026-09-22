import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export interface QuickAction {
  label: string
  href: string
  icon: LucideIcon
  /** Small line under the tile, e.g. "12 admitted". Omitted when not useful. */
  caption?: string
}

/**
 * Tile grid modelled on the reference HMS dashboard: a large outline icon on a
 * tinted square, with a live count underneath so the tile doubles as a status
 * readout rather than just a link.
 */
export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="rounded-xl surface p-5">
      <h2 className="mb-4 text-base font-semibold tracking-tight">Quick Actions</h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {actions.map((action) => (
          <li key={action.href} className="flex flex-col items-center gap-1.5">
            <Link
              href={action.href}
              className="flex w-full flex-col items-center gap-2.5 tile surface-lift rounded-xl px-3 py-5 text-center"
            >
              <action.icon
                className="size-8 text-primary"
                strokeWidth={1.5}
                aria-hidden
              />
              <span className="text-sm font-medium text-primary">{action.label}</span>
            </Link>
            {action.caption ? (
              <span className="text-xs text-muted-foreground">{action.caption}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}
