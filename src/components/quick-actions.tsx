import Link from "next/link"

import type { BadgeIcon } from "@/components/badge-icons"

export interface QuickAction {
  label: string
  href: string
  icon: BadgeIcon
  /** Small line under the tile, e.g. "12 admitted". Omitted when not useful. */
  caption?: string
}

/**
 * Tile grid modelled on the reference HMS dashboard: a colour-coded
 * illustrated icon (badge-icons.tsx), with a live count underneath so
 * the tile doubles as a status readout rather than just a link.
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
              className="group flex w-full flex-col items-center gap-3 tile surface-lift rounded-xl px-3 py-5 text-center"
            >
              <action.icon className="size-13 drop-shadow-[0_6px_8px_rgb(0_0_0/0.18)] transition-transform duration-200 ease-out group-hover:-translate-y-0.5 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:transform-none" />
              <span className="text-sm font-medium text-foreground">{action.label}</span>
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
