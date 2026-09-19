import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Settings" }

export default function SettingsPage() {
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
