import { BillingSkeleton } from "@/components/skeletons/billing-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { FilterGroupSkeleton } from "@/components/skeletons/table-skeleton"

export default function BillingLoading() {
  return (
    <>
      {/* Fixed copy, so it renders for real. */}
      <PageHeader
        title="Billing"
        description="What each family has been charged, paid, and still owes."
        actions={<FilterGroupSkeleton width="w-60" />}
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <BillingSkeleton />
      </div>
    </>
  )
}
