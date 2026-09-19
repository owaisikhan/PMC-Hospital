import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Doctors" }

export default function DoctorsPage() {
  return (
    <>
      <PageHeader title="Doctors" description="Consultants, specialties and duty rosters." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Doctor directory with specialty and department filters",
            "Weekly availability and on-call roster",
            "Per-doctor appointment load",
          ]}
        />
      </div>
    </>
  )
}
