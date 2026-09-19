"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { findActiveNavItem } from "@/lib/navigation"
import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

/**
 * Page title block plus the active module's sub-tab strip. The tabs come from
 * `navigation.ts`, so a page never has to declare them itself.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const pathname = usePathname()
  const tabs = findActiveNavItem(pathname)?.tabs ?? []

  return (
    <div className="border-b border-border">
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 pt-6 pb-4 sm:px-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>

      {tabs.length > 0 ? (
        <nav className="flex gap-4 overflow-x-auto px-4 sm:px-6" aria-label="Section">
          {tabs.map((tab) => {
            const isActive = pathname === tab.href

            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "-mb-px border-b-2 px-0.5 pb-2.5 text-sm whitespace-nowrap transition-colors",
                  isActive
                    ? "border-primary font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      ) : null}
    </div>
  )
}
