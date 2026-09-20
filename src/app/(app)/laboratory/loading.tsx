import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton"
import {
  FilterGroupSkeleton,
  TableSkeleton,
  TableSummarySkeleton,
  type SkeletonColumn,
} from "@/components/skeletons/table-skeleton"
import { Skeleton } from "@/components/ui/skeleton"

const COLUMNS: SkeletonColumn[] = [
  { label: "S#", bar: "w-4", head: "w-14" },
  // The patient's MRN sits under their name, so this column is two lines.
  { label: "Patient", bar: "w-24", subBar: "w-16" },
  { label: "Test", bar: "w-20" },
  { label: "Ordered on", bar: "w-14" },
  { label: "Lab", bar: "w-16" },
  { label: "Status", bar: "w-16" },
  { label: "Charge", bar: "w-10", align: "right" },
  { label: "Cost", bar: "w-10", align: "right" },
  { label: "Actions", bar: "w-14", hiddenLabel: true },
]

export default function LaboratoryLoading() {
  return (
    <>
      {/* The title is fixed, but the description is not: it depends on whether
          PMC is running its own lab or sending tests out, which is a setting
          this fallback cannot read. Placeheld rather than guessed. */}
      <PageHeaderSkeleton
        title="Laboratory"
        descriptionWidth="w-[26rem]"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroupSkeleton width="w-52" />
            <Skeleton className="h-11 w-40 rounded-lg" delay={0.08} />
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <TableSummarySkeleton width="w-[28rem]" />
        <TableSkeleton
          columns={COLUMNS}
          minWidth="min-w-[56rem]"
          caption="Loading lab orders"
        />
      </div>
    </>
  )
}
