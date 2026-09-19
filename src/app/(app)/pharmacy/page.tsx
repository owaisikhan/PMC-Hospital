import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Pharmacy" }

export default function PharmacyPage() {
  return (
    <>
      <PageHeader title="Pharmacy" description="Stock, batches and sales." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Receive stock with batch number, expiry date, cost and sale price",
            "Sell to a patient, deducting from a specific batch",
            "Expiry and low-stock warnings",
            "Margin per sale from the batch cost price",
          ]}
        />
      </div>
    </>
  )
}
