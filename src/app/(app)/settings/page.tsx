import { PageHeader } from "@/components/layout/page-header"
import { requireAdmin } from "@/lib/supabase/session"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Settings" }

export default async function SettingsPage() {
  // Hiding the sidebar link is tidiness, not access control: without this a
  // staff member who types the URL reaches the page.
  await requireAdmin()

  return (
    <>
      <PageHeader title="Settings" description="Rates, wards, staff and user accounts." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Edit charge rates without affecting bills already raised",
            "Manage wards and bed counts",
            "Staff records and monthly salaries",
            "Approve new logins and set admin or staff role",
          ]}
        />
      </div>
    </>
  )
}
