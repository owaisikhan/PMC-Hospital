import {
  EmailDisplay,
  LogoForm,
  NameForm,
  PasswordForm,
} from "@/components/settings/personal-info"
import {
  PermissionsSection,
  type Login,
  type Session,
} from "@/components/settings/permissions-section"
import { PageHeader } from "@/components/layout/page-header"
import { SlidingTabs, type TabIconName, type TabItem } from "@/components/ui/sliding-tabs"
import { TabPanel } from "@/components/ui/tab-panel"
import { createClient } from "@/lib/supabase/server"
import { requireAdmin } from "@/lib/supabase/session"
import { sessionIdFromAccessToken } from "@/lib/supabase/session-id"

export const metadata = { title: "Settings" }

/**
 * auth.sessions.refreshed_at is a timestamp without a time zone (UTC in
 * practice) while the others carry one. Reading the bare one as-is would
 * treat it as server-local time, so everything is normalised to UTC ISO here,
 * which also makes the values safe to compare as strings.
 */
function toUtcIso(value: string): string {
  const hasZone = /(?:Z|[+-]\d{2}(?::?\d{2})?)$/.test(value)
  return new Date(hasZone ? value : `${value.replace(" ", "T")}Z`).toISOString()
}

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

  // Admin only - staff have no reason to see this page at all, and no link
  // to it appears in their sidebar either.
  const profile = await requireAdmin()

  const tab: SettingsTab = TABS.includes(rawTab as SettingsTab)
    ? (rawTab as SettingsTab)
    : "personal"

  const supabase = await createClient()

  const [settingsResult, logins, sessions] = await Promise.all([
    supabase.from("settings").select("value").eq("key", "branding").maybeSingle(),
    tab === "permissions" ? supabase.rpc("list_logins") : Promise.resolve({ data: null }),
    tab === "permissions" ? supabase.rpc("list_sessions") : Promise.resolve({ data: null }),
  ])

  const logoUrl =
    (settingsResult.data?.value as { logo_url?: string } | null)?.logo_url ?? null

  const loginRows: Login[] = (
    (logins.data ?? []) as {
      id: string
      full_name: string
      username: string | null
      email: string
      role: "admin" | "staff"
      is_active: boolean
    }[]
  ).map((row) => ({
    id: row.id,
    fullName: row.full_name,
    username: row.username,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
  }))

  const sessionRows: Session[] = (
    (sessions.data ?? []) as {
      user_id: string
      session_id: string
      user_agent: string | null
      ip: string | null
      created_at: string
      refreshed_at: string | null
      not_after: string | null
      city: string | null
      country: string | null
      seen_ip: string | null
      last_seen_at: string | null
    }[]
  ).map((row) => {
    const createdAt = toUtcIso(row.created_at)
    return {
      userId: row.user_id,
      sessionId: row.session_id,
      userAgent: row.user_agent,
      createdAt,
      lastSeenAt: [row.last_seen_at, row.refreshed_at]
        .filter((value): value is string => Boolean(value))
        .map(toUtcIso)
        .reduce((latest, value) => (value > latest ? value : latest), createdAt),
      city: row.city,
      country: row.country,
      ip: row.ip,
      seenIp: row.seen_ip,
    }
  })

  // Which of those is the device this page is being viewed on, so it can be
  // labelled and left without a Sign out button of its own.
  let currentSessionId: string | null = null
  if (tab === "permissions") {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    currentSessionId = sessionIdFromAccessToken(session?.access_token)
  }

  const tabItems: TabItem[] = TABS.map((key) => ({
    key,
    label: TAB_LABELS[key],
    icon: TAB_ICONS[key],
    href: `/settings?tab=${key}`,
  }))

  return (
    <>
      <PageHeader
        title="Settings"
        description="Your login, and who has access to PMC."
        actions={
          <SlidingTabs
            items={tabItems}
            active={tab}
            groupId="settings-tab"
            ariaLabel="Settings sections"
            size="large"
          />
        }
      />

      <div className="px-4 py-6 sm:px-6">
        <TabPanel panelKey={tab} index={TABS.indexOf(tab)}>
          {tab === "personal" ? (
            <div className="flex max-w-xl flex-col gap-4">
              <NameForm fullName={profile.fullName} />
              <EmailDisplay email={profile.email} />
              <PasswordForm />
              <LogoForm currentUrl={logoUrl} />
            </div>
          ) : (
            <PermissionsSection
              logins={loginRows}
              sessions={sessionRows}
              currentUserId={profile.id}
              currentSessionId={currentSessionId}
            />
          )}
        </TabPanel>
      </div>
    </>
  )
}
