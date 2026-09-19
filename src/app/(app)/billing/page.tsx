import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Billing" }

export default function BillingPage() {
  return (
    <>
      <PageHeader title="Billing" description="Invoices, payments and insurance claims." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Invoice list with paid, partial and overdue states",
            "Itemized invoice builder",
            "Payment recording and insurance claims",
          ]}
        />
      </div>
    </>
  )
}
