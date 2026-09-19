import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Settings" }

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Settings" description="Hospital profile, departments, users and roles." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Hospital profile and branding",
            "Departments and service catalog",
            "Staff accounts, roles and permissions",
          ]}
        />
      </div>
    </>
  )
}
