import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Reports" }

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Operational and clinical reporting." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Admissions, occupancy and revenue over time",
            "Department-level activity breakdown",
            "Exportable date-ranged reports",
          ]}
        />
      </div>
    </>
  )
}
