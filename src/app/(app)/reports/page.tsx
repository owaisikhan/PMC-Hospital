import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Reports" }

export default function ReportsPage() {
  return (
    <>
      <PageHeader title="Reports" description="Income, expenses and profit." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Daily cash summary: what came in, what went out",
            "Monthly profit and loss by category",
            "Ward occupancy and admission counts",
            "Export a date range",
          ]}
        />
      </div>
    </>
  )
}
