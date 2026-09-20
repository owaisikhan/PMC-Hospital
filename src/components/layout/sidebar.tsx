"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { HeartPulse } from "lucide-react"

import { visibleSections } from "@/lib/navigation"
import type { UserRole } from "@/lib/roles"
import { cn } from "@/lib/utils"

/**
 * Takes the role rather than a ready-made section list: the sections carry
 * Lucide icon components, and a React component cannot be serialised across the
 * server-to-client boundary. Building the list here keeps only a plain string
 * crossing over.
 */
export function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const sections = visibleSections(role)

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
      <Link href="/" className="flex h-14 items-center gap-2 px-4">
        <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <HeartPulse className="size-4.5" />
        </span>
        <span className="flex flex-col leading-tight">
          <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
            PMC
          </span>
          <span className="text-[0.6875rem] text-muted-foreground">
            Paeds Medical Complex
          </span>
        </span>
      </Link>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.label} className="mb-5 last:mb-0">
            <p className="px-2 pb-1.5 text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              {section.label}
            </p>
            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`)

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm transition-colors",
                        isActive
                          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element -- fixed-size decorative icon; Next does not optimise SVG, and serving these as files keeps ~45KB of markup out of the JS bundle
                        <img
                          src={item.image}
                          alt=""
                          aria-hidden
                          className="size-5 shrink-0"
                        />
                      ) : (
                        <item.icon className="size-5 shrink-0" />
                      )}
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
