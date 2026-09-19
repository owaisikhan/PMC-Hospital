import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Laboratory" }

export default function LaboratoryPage() {
  return (
    <>
      <PageHeader title="Laboratory" description="Tests sent to external labs." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Order a test for a patient and record which external lab it went to",
            "Track charge to patient against cost from the lab",
            "Enter results and mark the order complete",
            "Switch to in-house mode when PMC's own lab opens",
          ]}
        />
      </div>
    </>
  )
}
