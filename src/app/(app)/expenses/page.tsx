import { PageHeader } from "@/components/layout/page-header"
import { requireAdmin } from "@/lib/supabase/session"
import { ModulePlaceholder } from "@/components/layout/module-placeholder"

export const metadata = { title: "Expenses" }

export default async function ExpensesPage() {
  // Hiding the sidebar link is tidiness, not access control: without this a
  // staff member who types the URL reaches the page.
  await requireAdmin()

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
