import type { LucideIcon } from "lucide-react"
import {
  FlaskConical,
  IdCard,
  LayoutDashboard,
  Pill,
  Receipt,
  Settings,
  Users,
  Wallet,
} from "lucide-react"

import type { UserRole } from "@/lib/roles"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /**
   * A cropped illustration in public/icons, built from the artwork in
   * assets/icons by scripts/build-nav-icons.mjs. Items without one fall back
   * to the Lucide glyph above.
   */
  image?: string
  /** Omitted means both roles. 'admin' hides the item from staff. */
  requiresRole?: UserRole
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * Single source of truth for the sidebar. The money sections are admin-only
 * here for tidiness — the database enforces the same rule independently, so
 * hiding a link is never the thing keeping staff out of the financials.
 */
export const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
        image: "/icons/dashboard.svg",
      },
    ],
  },
  {
    label: "Clinical",
    items: [
      {
        label: "Patients",
        href: "/patients",
        icon: Users,
        image: "/icons/patients.svg",
      },
      {
        label: "Laboratory",
        href: "/laboratory",
        icon: FlaskConical,
        image: "/icons/laboratory.svg",
      },
      {
        label: "Pharmacy",
        href: "/pharmacy",
        icon: Pill,
        image: "/icons/pharmacy.svg",
      },
    ],
  },
  {
    label: "Money",
    items: [
      {
        label: "Billing",
        href: "/billing",
        icon: Receipt,
        image: "/icons/billing.svg",
      },
      {
        label: "Expenses",
        href: "/expenses",
        icon: Wallet,
        image: "/icons/expenses.svg",
        requiresRole: "admin",
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Staff",
        href: "/staff",
        icon: IdCard,
        image: "/icons/staff.svg",
        requiresRole: "admin",
      },
      {
        // Every login reaches this — it is where a password is changed —
        // the Permissions tab inside it is what stays admin-only.
        label: "Settings",
        href: "/settings",
        icon: Settings,
        image: "/icons/settings.svg",
      },
    ],
  },
]

export function visibleSections(role: UserRole): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiresRole || item.requiresRole === role,
      ),
    }))
    .filter((section) => section.items.length > 0)
}
