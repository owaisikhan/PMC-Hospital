import type { LucideIcon } from "lucide-react"
import {
  BedDouble,
  FlaskConical,
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
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Clinical",
    items: [
      { label: "Patients", href: "/patients", icon: Users },
      { label: "Wards", href: "/wards", icon: BedDouble },
      { label: "Laboratory", href: "/laboratory", icon: FlaskConical },
      { label: "Pharmacy", href: "/pharmacy", icon: Pill },
    ],
  },
  {
    label: "Money",
    items: [
      { label: "Billing", href: "/billing", icon: Receipt },
      { label: "Expenses", href: "/expenses", icon: Wallet, requiresRole: "admin" },
    ],
  },
  {
    label: "Administration",
    items: [{ label: "Settings", href: "/settings", icon: Settings, requiresRole: "admin" }],
  },
]

export function visibleSections(role: UserRole): NavSection[] {
  return navSections
    .map((section) => ({
      ...section,
      items: section.items.filter(
        (item) => !item.requiresRole || item.requiresRole === role
      ),
    }))
    .filter((section) => section.items.length > 0)
}
