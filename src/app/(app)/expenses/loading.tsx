import { PageHeader } from "@/components/layout/page-header"
import {
  FilterGroupSkeleton,
  TableSkeleton,
  type SkeletonColumn,
} from "@/components/skeletons/table-skeleton"
import { Skeleton, SkeletonLine } from "@/components/ui/skeleton"

// The Expenses tab is what opens by default, so that is what is placeheld.
const COLUMNS: SkeletonColumn[] = [
  { label: "Date", bar: "w-20" },
  { label: "Particulars", bar: "w-44" },
  { label: "Category", bar: "w-20", subBar: "w-24" },
  { label: "Paid by", bar: "w-14" },
  { label: "Amount", bar: "w-20", align: "right" },
  { label: "Actions", bar: "w-16", hiddenLabel: true },
]

export default function ExpensesLoading() {
  return (
    <>
      {/* Fixed copy, so it renders for real. */}
      <PageHeader
        title="Expenses"
        description="Every rupee leaving PMC: running costs, salaries, and who is on the payroll."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FilterGroupSkeleton width="w-52" />
            <Skeleton className="h-11 w-44 rounded-lg" delay={0.08} />
          </div>
        }
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-11 w-44 rounded-lg" />
          <SkeletonLine line="h-6" bar="h-4" width="w-64" delay={0.08} />
        </div>

        {/* The per-category cards above the table. */}
        <div className="flex flex-wrap gap-2">
          {["w-36", "w-32", "w-36", "w-32"].map((width, index) => (
            <div
              key={width + index}
              className="flex flex-col gap-0.5 rounded-xl border border-border bg-card px-4 py-3"
            >
              <SkeletonLine line="h-5" bar="h-3" width="w-20" delay={0.1 + index * 0.06} />
              <SkeletonLine line="h-7" bar="h-5" width={width} delay={0.14 + index * 0.06} />
              <SkeletonLine line="h-4" bar="h-3" width="w-24" delay={0.18 + index * 0.06} />
            </div>
          ))}
        </div>

        <TableSkeleton
          columns={COLUMNS}
          minWidth="min-w-[48rem]"
          caption="Loading expenses"
        />
      </div>
    </>
  )
}
