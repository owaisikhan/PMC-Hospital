import type { LucideIcon } from "lucide-react"
import {
  Activity,
  BedDouble,
  CalendarDays,
  CreditCard,
  FlaskConical,
  LayoutDashboard,
  Pill,
  Settings,
  Stethoscope,
  Users,
} from "lucide-react"

export interface NavTab {
  label: string
  href: string
}

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Sub-tabs rendered in the page header when this module is active. */
  tabs?: NavTab[]
}

export interface NavSection {
  label: string
  items: NavItem[]
}

/**
 * Single source of truth for the sidebar, the in-page tab strips and the
 * breadcrumb trail. Adding a module means adding an entry here plus the
 * matching route folder under `src/app/(app)/`.
 */
export const navSections: NavSection[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/", icon: LayoutDashboard }],
  },
  {
    label: "Clinical",
    items: [
      {
        label: "Patients",
        href: "/patients",
        icon: Users,
        tabs: [
          { label: "All patients", href: "/patients" },
          { label: "Admitted", href: "/patients/admitted" },
          { label: "Outpatient", href: "/patients/outpatient" },
        ],
      },
      {
        label: "Appointments",
        href: "/appointments",
        icon: CalendarDays,
        tabs: [
          { label: "Schedule", href: "/appointments" },
          { label: "Requests", href: "/appointments/requests" },
        ],
      },
      { label: "Doctors", href: "/doctors", icon: Stethoscope },
      { label: "Wards & beds", href: "/wards", icon: BedDouble },
      { label: "Laboratory", href: "/laboratory", icon: FlaskConical },
      { label: "Pharmacy", href: "/pharmacy", icon: Pill },
    ],
  },
  {
    label: "Administration",
    items: [
      { label: "Billing", href: "/billing", icon: CreditCard },
      { label: "Reports", href: "/reports", icon: Activity },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
]

export const navItems: NavItem[] = navSections.flatMap((section) => section.items)

/** Longest-prefix match so `/patients/admitted` still highlights `Patients`. */
export function findActiveNavItem(pathname: string): NavItem | undefined {
  return navItems
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
}
