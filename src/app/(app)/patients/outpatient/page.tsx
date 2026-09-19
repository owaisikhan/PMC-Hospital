import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Outpatient" }

export default function OutpatientPage() {
  return (
    <>
      <PageHeader title="Outpatient" description="Outpatient visits and follow-ups." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Today's outpatient queue",
            "Follow-up scheduling from a completed visit",
          ]}
        />
      </div>
    </>
  )
}
