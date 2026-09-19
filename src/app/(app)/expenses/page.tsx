import { PageHeader } from "@/components/layout/page-header"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Expenses" }

export default function ExpensesPage() {
  return (
    <>
      <PageHeader title="Expenses" description="Rent, salaries, utilities and purchases." />
      <div className="px-4 py-6 sm:px-6">
        <ModulePlaceholder
          planned={[
            "Record rent, electricity and other running costs",
            "Monthly salary run from the staff list",
            "Pharmacy stock purchases and external lab payouts",
            "Correct a mistake with a reversal, never a silent edit",
          ]}
        />
      </div>
    </>
  )
}
