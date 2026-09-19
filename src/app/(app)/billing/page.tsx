import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Billing" }

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Billing" description="Patient bills and payments received." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Bill per admission combining ward charges, pharmacy and lab",
            "Record payments as cash, bank or card",
            "Outstanding balance per patient",
          ]}
        />
      </div>
    </>
  )
}
