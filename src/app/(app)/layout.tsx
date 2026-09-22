import {
  NavigationProgressProvider,
  PendingRegion,
} from "@/components/layout/navigation-progress"
import { RoleProvider } from "@/components/layout/role-context"
import { Sidebar } from "@/components/layout/sidebar"
import { ToastProvider } from "@/components/layout/toast-context"
import { Topbar } from "@/components/layout/topbar"
import { createClient } from "@/lib/supabase/server"
import { requireProfile } from "@/lib/supabase/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Every page under this layout is gated twice: here, and again by the
  // database's row level security when it actually reads anything.
  const profile = await requireProfile()

  // Anyone signed in can read this row (RLS: "read settings"), so the logo
  // shows the same for every login rather than only once Settings has been
  // visited.
  const supabase = await createClient()
  const { data: branding } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "branding")
    .maybeSingle()
  const logoUrl = (branding?.value as { logo_url?: string } | null)?.logo_url ?? null

  return (
    <ToastProvider>
      <NavigationProgressProvider>
        <div className="flex h-dvh overflow-hidden">
          <Sidebar role={profile.role} logoUrl={logoUrl} />
          <div className="flex min-w-0 flex-1 flex-col">
            <Topbar profile={profile} logoUrl={logoUrl} />
            <main className="app-canvas flex-1 overflow-y-auto">
              <PendingRegion>
                {/* The role is published here so the loading skeletons can match the
                    page that is about to replace them. */}
                <RoleProvider role={profile.role}>{children}</RoleProvider>
              </PendingRegion>
            </main>
          </div>
        </div>
      </NavigationProgressProvider>
    </ToastProvider>
  )
}
