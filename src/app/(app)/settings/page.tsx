import {
  EmailDisplay,
  LogoForm,
  NameForm,
  PasswordForm,
} from "@/components/settings/personal-info"
import { PermissionsSection, type Login } from "@/components/settings/permissions-section"
import { PageHeader } from "@/components/layout/page-header"
import { SlidingTabs, type TabIconName, type TabItem } from "@/components/ui/sliding-tabs"
import { TabPanel } from "@/components/ui/tab-panel"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export const metadata = { title: "Settings" }

const TABS = ["personal", "permissions"] as const
type SettingsTab = (typeof TABS)[number]

const TAB_LABELS: Record<SettingsTab, string> = {
  personal: "Personal info",
  permissions: "Permissions",
}

const TAB_ICONS: Record<SettingsTab, TabIconName> = {
  personal: "user",
  permissions: "shield",
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams

  // Every login reaches Personal info; Permissions is admin-only and simply
  // does not appear as a tab for staff, rather than gating the whole route —
  // anyone signed in still needs to change their own name and password here.
  const profile = await requireProfile()
  const isAdmin = profile.role === "admin"

  const visibleTabs: readonly SettingsTab[] = isAdmin ? TABS : (["personal"] as const)
  const tab: SettingsTab = visibleTabs.includes(rawTab as SettingsTab)
    ? (rawTab as SettingsTab)
    : "personal"

  const supabase = await createClient()

  const [settingsResult, logins] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "branding").maybeSingle(),
    isAdmin && tab === "permissions"
      ? supabase.rpc("list_logins")
      : Promise.resolve({ data: null }),
  ])

  const logoUrl =
    (settingsResult.data?.value as { logo_url?: string } | null)?.logo_url ?? null

  const loginRows: Login[] = (
    (logins.data ?? []) as {
      id: string
      full_name: string
      email: string
      role: "admin" | "staff"
      is_active: boolean
    }[]
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
  }))

  const tabItems: TabItem[] = visibleTabs.map((key) => ({
    key,
    label: TAB_LABELS[key],
    icon: TAB_ICONS[key],
    href: `/settings?tab=${key}`,
  }))

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your login, and — for administrators — who has access to PMC."
        actions={
          isAdmin ? (
            <SlidingTabs
              items={tabItems}
              active={tab}
              groupId="settings-tab"
              ariaLabel="Settings sections"
              size="large"
            />
          ) : undefined
        }
      />

      <div className="px-4 py-6 sm:px-6">
        <TabPanel panelKey={tab} index={visibleTabs.indexOf(tab)}>
          {tab === "personal" ? (
            <div className="flex max-w-xl flex-col gap-4">
              <NameForm fullName={profile.fullName} />
              <EmailDisplay email={profile.email} />
              <PasswordForm />
              {isAdmin ? <LogoForm currentUrl={logoUrl} /> : null}
            </div>
          ) : (
            <PermissionsSection logins={loginRows} currentUserId={profile.id} />
          )}
        </TabPanel>
      </div>
    </>
  )
}
