"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef } from "react"
import { Menu, X } from "lucide-react"

import { Brand, SidebarNav } from "@/components/layout/sidebar"
import type { UserRole } from "@/lib/roles"

/**
 * Below lg the sidebar is hidden, and before this there was no way to reach
 * any other page from a phone. A menu button in the topbar opens the same
 * navigation (SidebarNav, one shared copy) as a drawer from the left.
 *
 * A native modal <dialog>: the browser supplies the backdrop, Escape to close,
 * keeping focus inside while open and making the page behind it inert - none
 * of which then has to be rebuilt, or can drift, here.
 */
export function MobileNav({ role, logoUrl }: { role: UserRole; logoUrl?: string | null }) {
  const drawer = useRef<HTMLDialogElement>(null)
  const pathname = usePathname()

  // Tapping a link navigates; the drawer should not still be covering the
  // page that just opened.
  useEffect(() => {
    drawer.current?.close()
  }, [pathname])

  return (
    <div className="flex items-center gap-1 lg:hidden">
      <button
        type="button"
        onClick={() => drawer.current?.showModal()}
        aria-label="Open menu"
        className="flex size-10 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <Menu className="size-5.5" />
      </button>

      <dialog
        ref={drawer}
        aria-label="Menu"
        className="nav-drawer"
        // A tap on the backdrop lands on the <dialog> element itself; a tap
        // inside the panel lands on one of its children.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border pr-2">
            <Brand logoUrl={logoUrl} />
            <button
              type="button"
              onClick={() => drawer.current?.close()}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <X className="size-5" />
            </button>
          </div>
          <SidebarNav role={role} large />
        </div>
      </dialog>
    </div>
  )
}
