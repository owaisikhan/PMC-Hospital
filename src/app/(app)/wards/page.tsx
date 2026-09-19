import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Wards & beds" }

export default function WardsPage() {
  return (
    <>
      <PageHeader title="Wards & beds" description="Ward capacity and live bed allocation." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Bed map per ward with occupancy state",
            "Bed assignment and transfer",
            "Housekeeping and turnover status",
          ]}
        />
      </div>
    </>
  )
}
