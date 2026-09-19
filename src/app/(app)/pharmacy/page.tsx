import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Pharmacy" }

export default function PharmacyPage() {
  return (
    <>
      <PageHeader title="Pharmacy" description="Prescriptions, dispensing and stock." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Prescription queue from consultations",
            "Dispensing with stock deduction",
            "Inventory levels and expiry alerts",
          ]}
        />
      </div>
    </>
  )
}
