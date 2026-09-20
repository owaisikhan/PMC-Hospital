import { PageHeader } from "@/components/layout/page-header"
import {
  TableSkeleton,
  TableSummarySkeleton,
  type SkeletonColumn,
} from "@/components/skeletons/table-skeleton"
import { SkeletonLine } from "@/components/ui/skeleton"

// Columns match the real table, including the narrow S# column, so nothing
// re-flows when the stock arrives.
const COLUMNS: SkeletonColumn[] = [
  { label: "S#", bar: "w-4", head: "w-14" },
  { label: "SKU", bar: "w-14" },
  // Medicine carries the form and strength under the name, which is what
  // makes the real rows two lines tall.
  { label: "Medicine", bar: "w-32", subBar: "w-20" },
  { label: "Stock", bar: "w-20" },
  { label: "Purchase price", bar: "w-14", align: "right" },
  { label: "Sale price", bar: "w-14", align: "right" },
  { label: "Expiry date", bar: "w-16" },
]

export default function PharmacyLoading() {
  return (
    <>
      {/* Title and description are fixed copy, so they render for real. */}
      <PageHeader
        title="Pharmacy"
        description="Medicines held in stock, with what they cost and what they sell for."
      />

      <div className="flex flex-col gap-4 px-4 py-6 sm:px-6">
        <TableSummarySkeleton width="w-56" />
        <TableSkeleton
          columns={COLUMNS}
          minWidth="min-w-[52rem]"
          caption="Loading pharmacy stock"
        />
        {/* The footnote below the table is fixed copy too, but it is two lines
            of small print; a bar keeps the page height honest without
            pretending to be text. */}
        <div className="flex flex-col gap-1">
          <SkeletonLine line="h-5" bar="h-3" width="w-full max-w-2xl" delay={0.5} />
          <SkeletonLine line="h-5" bar="h-3" width="w-72" delay={0.55} />
        </div>
      </div>
    </>
  )
}
