import { BillingSkeleton } from "@/components/skeletons/billing-skeleton"
import { PageHeader } from "@/components/layout/page-header"
import { FilterGroupSkeleton } from "@/components/skeletons/table-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

export default function BillingLoading() {
  return (
    <>
      {/* Fixed copy, so it renders for real. The controls moved into the body,
          so the header carries no actions any more. */}
      <PageHeader
        title="Billing"
        description="What each family has been charged, paid, and still owes."
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <FilterGroupSkeleton width="w-72" />
          <FilterGroupSkeleton width="w-52" />
          <Skeleton className="h-11 w-full rounded-lg sm:max-w-md" delay={0.08} />
        </div>
        <BillingSkeleton />
      </div>
    </>
  )
}
