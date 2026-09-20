import { RoleProvider } from "@/components/layout/role-context"
import { Sidebar } from "@/components/layout/sidebar"
import { ToastProvider } from "@/components/layout/toast-context"
import { Topbar } from "@/components/layout/topbar"
import { requireProfile } from "@/lib/supabase/session"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Every page under this layout is gated twice: here, and again by the
  // database's row level security when it actually reads anything.
  const profile = await requireProfile()

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden">
        <Sidebar role={profile.role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar profile={profile} />
          <main className="flex-1 overflow-y-auto bg-muted/30">
            {/* The role is published here so the loading skeletons can match the
                page that is about to replace them. */}
            <RoleProvider role={profile.role}>{children}</RoleProvider>
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
